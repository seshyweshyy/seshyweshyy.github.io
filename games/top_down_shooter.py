import math
import random
import sys

import pygame


WIDTH = 960
HEIGHT = 540
FPS = 60
PLAYER_SPEED = 260
PLAYER_RADIUS = 18
BULLET_SPEED = 520
BULLET_RADIUS = 4
ENEMY_SPEED = 110
ENEMY_RADIUS = 16
SPAWN_INTERVAL = 0.9
MAX_ENEMIES = 18


class Player:
    def __init__(self, position):
        self.position = pygame.Vector2(position)
        self.health = 100
        self.last_shot = 0.0

    def move(self, direction, delta):
        if direction.length_squared() == 0:
            return
        direction = direction.normalize()
        self.position += direction * PLAYER_SPEED * delta
        self.position.x = max(PLAYER_RADIUS, min(WIDTH - PLAYER_RADIUS, self.position.x))
        self.position.y = max(PLAYER_RADIUS, min(HEIGHT - PLAYER_RADIUS, self.position.y))


class Bullet:
    def __init__(self, position, velocity):
        self.position = pygame.Vector2(position)
        self.velocity = pygame.Vector2(velocity)

    def update(self, delta):
        self.position += self.velocity * delta

    def is_offscreen(self):
        return (
            self.position.x < -BULLET_RADIUS
            or self.position.x > WIDTH + BULLET_RADIUS
            or self.position.y < -BULLET_RADIUS
            or self.position.y > HEIGHT + BULLET_RADIUS
        )


class Enemy:
    def __init__(self, position):
        self.position = pygame.Vector2(position)

    def update(self, target, delta):
        direction = target - self.position
        if direction.length_squared() == 0:
            return
        self.position += direction.normalize() * ENEMY_SPEED * delta


class Game:
    def __init__(self, screen):
        self.screen = screen
        self.clock = pygame.time.Clock()
        self.font = pygame.font.SysFont("consolas", 20)
        self.big_font = pygame.font.SysFont("consolas", 48)
        self.player = Player((WIDTH / 2, HEIGHT / 2))
        self.bullets = []
        self.enemies = []
        self.score = 0
        self.spawn_timer = 0.0
        self.running = True
        self.game_over = False

    def spawn_enemy(self):
        edges = [
            (random.uniform(0, WIDTH), -ENEMY_RADIUS * 2),
            (random.uniform(0, WIDTH), HEIGHT + ENEMY_RADIUS * 2),
            (-ENEMY_RADIUS * 2, random.uniform(0, HEIGHT)),
            (WIDTH + ENEMY_RADIUS * 2, random.uniform(0, HEIGHT)),
        ]
        self.enemies.append(Enemy(random.choice(edges)))

    def shoot(self, direction):
        if direction.length_squared() == 0:
            return
        velocity = direction.normalize() * BULLET_SPEED
        self.bullets.append(Bullet(self.player.position, velocity))

    def handle_events(self):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    self.running = False
                if event.key == pygame.K_r and self.game_over:
                    self.reset()
            if event.type == pygame.MOUSEBUTTONDOWN and not self.game_over:
                if event.button == 1:
                    mouse_pos = pygame.Vector2(pygame.mouse.get_pos())
                    self.shoot(mouse_pos - self.player.position)

    def reset(self):
        self.player = Player((WIDTH / 2, HEIGHT / 2))
        self.bullets = []
        self.enemies = []
        self.score = 0
        self.spawn_timer = 0.0
        self.game_over = False

    def update(self, delta):
        keys = pygame.key.get_pressed()
        direction = pygame.Vector2(
            (keys[pygame.K_d] or keys[pygame.K_RIGHT])
            - (keys[pygame.K_a] or keys[pygame.K_LEFT]),
            (keys[pygame.K_s] or keys[pygame.K_DOWN])
            - (keys[pygame.K_w] or keys[pygame.K_UP]),
        )
        if not self.game_over:
            self.player.move(direction, delta)

        mouse_buttons = pygame.mouse.get_pressed()
        if mouse_buttons[0] and not self.game_over:
            mouse_pos = pygame.Vector2(pygame.mouse.get_pos())
            self.player.last_shot += delta
            if self.player.last_shot > 0.18:
                self.player.last_shot = 0.0
                self.shoot(mouse_pos - self.player.position)

        for bullet in self.bullets:
            bullet.update(delta)
        self.bullets = [bullet for bullet in self.bullets if not bullet.is_offscreen()]

        for enemy in self.enemies:
            enemy.update(self.player.position, delta)

        self.handle_collisions()

        if not self.game_over:
            self.spawn_timer += delta
            if self.spawn_timer >= SPAWN_INTERVAL and len(self.enemies) < MAX_ENEMIES:
                self.spawn_timer = 0.0
                self.spawn_enemy()

    def handle_collisions(self):
        if self.game_over:
            return
        remaining_bullets = []
        for bullet in self.bullets:
            hit = False
            for enemy in self.enemies:
                if enemy.position.distance_to(bullet.position) <= ENEMY_RADIUS + BULLET_RADIUS:
                    enemy.position.y = -9999
                    hit = True
                    self.score += 10
                    break
            if not hit:
                remaining_bullets.append(bullet)
        self.bullets = remaining_bullets
        self.enemies = [enemy for enemy in self.enemies if enemy.position.y > -9990]

        for enemy in self.enemies:
            if enemy.position.distance_to(self.player.position) <= ENEMY_RADIUS + PLAYER_RADIUS:
                self.player.health -= 20
                enemy.position.y = -9999
                if self.player.health <= 0:
                    self.game_over = True
        self.enemies = [enemy for enemy in self.enemies if enemy.position.y > -9990]

    def draw_arena(self):
        self.screen.fill((24, 25, 30))
        for x in range(0, WIDTH, 40):
            pygame.draw.line(self.screen, (40, 40, 48), (x, 0), (x, HEIGHT))
        for y in range(0, HEIGHT, 40):
            pygame.draw.line(self.screen, (40, 40, 48), (0, y), (WIDTH, y))

    def draw(self):
        self.draw_arena()
        pygame.draw.circle(self.screen, (60, 180, 255), self.player.position, PLAYER_RADIUS)

        mouse_pos = pygame.Vector2(pygame.mouse.get_pos())
        direction = mouse_pos - self.player.position
        if direction.length_squared() > 0:
            direction = direction.normalize()
            muzzle = self.player.position + direction * (PLAYER_RADIUS + 4)
            pygame.draw.circle(self.screen, (160, 220, 255), muzzle, 4)

        for bullet in self.bullets:
            pygame.draw.circle(self.screen, (255, 230, 160), bullet.position, BULLET_RADIUS)
        for enemy in self.enemies:
            pygame.draw.circle(self.screen, (255, 90, 90), enemy.position, ENEMY_RADIUS)

        hud = self.font.render(f"Health: {self.player.health}   Score: {self.score}", True, (230, 230, 240))
        self.screen.blit(hud, (12, 12))

        if self.game_over:
            overlay = pygame.Surface((WIDTH, HEIGHT), pygame.SRCALPHA)
            overlay.fill((0, 0, 0, 180))
            self.screen.blit(overlay, (0, 0))
            title = self.big_font.render("Game Over", True, (255, 255, 255))
            subtitle = self.font.render("Press R to restart or Esc to quit", True, (200, 200, 200))
            self.screen.blit(title, title.get_rect(center=(WIDTH / 2, HEIGHT / 2 - 20)))
            self.screen.blit(subtitle, subtitle.get_rect(center=(WIDTH / 2, HEIGHT / 2 + 20)))

    def run(self):
        while self.running:
            delta = self.clock.tick(FPS) / 1000.0
            self.handle_events()
            if not self.game_over:
                self.update(delta)
            self.draw()
            pygame.display.flip()


def main():
    pygame.init()
    pygame.display.set_caption("Top-Down Shooter")
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    game = Game(screen)
    game.run()
    pygame.quit()
    sys.exit()


if __name__ == "__main__":
    main()
