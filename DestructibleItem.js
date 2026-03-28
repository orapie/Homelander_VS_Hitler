class DestructibleItem extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, hp) {
        super(scene, x, y, texture);
        scene.add.existing(this);
        scene.physics.add.existing(this, true); // 默认为静态物体
        
        this.hp = hp;
        this.isDestroyed = false;
    }

    takeDamage(amount) {
        if (this.isDestroyed) return;
        
        this.hp -= amount;
        if (this.hp <= 0) {
            this.onDestroy();
        }
    }

    onDestroy() {
        this.isDestroyed = true;
        this.disableBody(true, true);
    }
}

class Crate extends DestructibleItem {
    constructor(scene, x, y) {
        super(scene, x, y, 'crate', 20); // 20 HP
    }

    onDestroy() {
        // 播放粒子效果（占位符）
        this.createParticles(0x8B4513); // 棕色粒子
        super.onDestroy();
    }

    createParticles(color) {
        const emitter = this.scene.add.particles(this.x, this.y, 'particle', {
            color: [color],
            speed: { min: -100, max: 100 },
            scale: { start: 1, end: 0 },
            blendMode: 'ADD',
            lifespan: 500,
            quantity: 10,
            emitting: false
        });
        emitter.explode(15);
    }
}

class OilDrum extends DestructibleItem {
    constructor(scene, x, y) {
        super(scene, x, y, 'oil_drum', 10); // 10 HP
        this.explosionRadius = 150;
        this.explosionDamage = 50;
    }

    onDestroy() {
        // 1. 播放爆炸粒子效果
        this.createExplosionParticles();
        
        // 2. 屏幕震动
        this.scene.cameras.main.shake(300, 0.02);

        // 3. 范围伤害逻辑
        this.explode();

        super.onDestroy();
    }

    createExplosionParticles() {
        const emitter = this.scene.add.particles(this.x, this.y, 'particle', {
            color: [0xff4500, 0xffff00, 0x000000], // 橙色, 黄色, 黑色
            speed: { min: -200, max: 200 },
            scale: { start: 2, end: 0 },
            blendMode: 'ADD',
            lifespan: 800,
            quantity: 30,
            emitting: false
        });
        emitter.explode(30);
    }

    explode() {
        // 检测半径内的所有物体（玩家、可破坏物）
        // 获取玩家
        const player = this.scene.player;
        if (player) {
            const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
            if (dist <= this.explosionRadius) {
                // 对玩家造成伤害 (假设玩家有 hp 属性，如果没有先跳过或日志记录)
                if (player.takeDamage) player.takeDamage(this.explosionDamage);
            }
        }

        // 获取所有可破坏物组 (将在 LevelManager 中统筹)
        if (this.scene.destructibles) {
            this.scene.destructibles.children.each((item) => {
                if (item !== this && !item.isDestroyed) {
                    const dist = Phaser.Math.Distance.Between(this.x, this.y, item.x, item.y);
                    if (dist <= this.explosionRadius) {
                        item.takeDamage(this.explosionDamage);
                    }
                }
            });
        }
    }
}
