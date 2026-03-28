class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, hp, speed, scoreValue) {
        super(scene, x, y, texture);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.hp = hp;
        this.speed = speed;
        this.scoreValue = scoreValue;
        this.isDead = false;
        
        // 设置世界边界碰撞
        this.setCollideWorldBounds(true);
    }

    takeDamage(amount) {
        if (this.isDead) return;
        
        this.hp -= amount;
        
        // 受击闪红效果
        this.setTint(0xff0000);
        this.scene.time.delayedCall(100, () => {
            if (!this.isDead) this.clearTint();
        });

        if (this.hp <= 0) {
            this.die();
        }
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        
        // 增加得分
        if (this.scene.addScore) {
            this.scene.addScore(this.scoreValue);
        }

        // 随机掉落医疗包 (15% 概率)
        if (Math.random() < 0.15 && this.scene.levelManager.dropHealthPack) {
            this.scene.levelManager.dropHealthPack(this.x, this.y);
        }

        // 播放爆炸/倒地粒子效果
        this.createDeathParticles();
        
        // 延迟销毁
        this.disableBody(true, true);
    }

    createDeathParticles() {
        const emitter = this.scene.add.particles(this.x, this.y, 'particle', {
            speed: { min: -100, max: 100 },
            scale: { start: 1, end: 0 },
            blendMode: 'ADD',
            lifespan: 500,
            quantity: 15,
            emitting: false
        });
        emitter.explode(15);
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        
        // 性能优化：只在视野附近激活逻辑
        const cam = this.scene.cameras.main;
        const distance = Phaser.Math.Distance.Between(this.x, this.y, cam.midPoint.x, cam.midPoint.y);
        
        if (distance > 1200) {
            this.setActive(false);
            this.setVisible(false);
        } else {
            this.setActive(true);
            this.setVisible(true);
            this.updateAI(time, delta);
        }
    }

    updateAI(time, delta) {
        // 由子类实现
    }
}

// 步兵：巡逻 + 水平射击
class Infantry extends Enemy {
    constructor(scene, x, y) {
        super(scene, x, y, 'infantry', 30, 100, 100);
        this.direction = 1;
        this.lastFired = 0;
        this.fireRate = 2000; // 2秒一次
        this.detectionRange = 400;
    }

    updateAI(time, delta) {
        const player = this.scene.player;
        const distToPlayer = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

        // 如果玩家在范围内且在同一高度左右
        if (distToPlayer < this.detectionRange && Math.abs(this.y - player.y) < 100) {
            this.setVelocityX(0);
            // 面向玩家
            this.setFlipX(player.x < this.x);
            
            // 射击
            if (time > this.lastFired + this.fireRate) {
                this.shoot();
                this.lastFired = time;
            }
        } else {
            // 巡逻逻辑：在边缘掉头
            this.setVelocityX(this.speed * this.direction);
            this.setFlipX(this.direction < 0);
            
            if (this.body.blocked.left || this.body.blocked.right) {
                this.direction *= -1;
            }
        }
    }

    shoot() {
        const angle = this.flipX ? Math.PI : 0;
        this.scene.enemyBullets.fireBullet(this.x, this.y, angle);
    }
}

// 坦克：慢速 + 重型炮弹
class Tank extends Enemy {
    constructor(scene, x, y) {
        super(scene, x, y, 'tank', 200, 40, 500);
        this.lastFired = 0;
        this.fireRate = 3000;
        this.detectionRange = 600;
    }

    updateAI(time, delta) {
        const player = this.scene.player;
        const distToPlayer = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

        if (distToPlayer < this.detectionRange) {
            this.setVelocityX(0);
            this.setFlipX(player.x < this.x);
            
            if (time > this.lastFired + this.fireRate) {
                this.shoot();
                this.lastFired = time;
            }
        } else {
            this.setVelocityX(this.speed * (this.x > player.x ? -1 : 1));
        }
    }

    shoot() {
        const player = this.scene.player;
        const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        this.scene.enemyBullets.fireBullet(this.x, this.y, angle, true); // 重型炮弹
    }
}

// 飞机：横向飞过 + 投弹
class Plane extends Enemy {
    constructor(scene, x, y) {
        super(scene, x, y, 'plane', 50, 200, 300);
        this.body.setAllowGravity(false);
        this.bombsDropped = 0;
        this.maxBombs = 3;
    }

    updateAI(time, delta) {
        this.setVelocityX(this.speed);
        
        const player = this.scene.player;
        if (this.bombsDropped < this.maxBombs && Math.abs(this.x - player.x) < 50) {
            this.dropBomb();
        }

        // 飞出世界销毁
        if (this.x > this.scene.physics.world.bounds.width) {
            this.destroy();
        }
    }

    dropBomb() {
        this.bombsDropped++;
        this.scene.enemyBullets.fireBullet(this.x, this.y + 20, Math.PI / 2);
    }
}

// 炮兵：固定 + 高抛
class Artillery extends Enemy {
    constructor(scene, x, y) {
        super(scene, x, y, 'artillery', 80, 0, 400);
        this.body.setImmovable(true);
        this.lastFired = 0;
        this.fireRate = 4000;
    }

    updateAI(time, delta) {
        const player = this.scene.player;
        const distToPlayer = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

        if (distToPlayer < 800) {
            if (time > this.lastFired + this.fireRate) {
                this.shoot();
                this.lastFired = time;
            }
        }
    }

    shoot() {
        // 高抛弹道：角度约 60-75 度
        const angle = -Math.PI / 3; // 向上斜 60 度
        this.scene.enemyBullets.fireBullet(this.x, this.y - 30, angle, true);
    }
}

// 敌人子弹组
class EnemyBullets extends Phaser.Physics.Arcade.Group {
    constructor(scene) {
        super(scene.physics.world, scene);
        this.createMultiple({
            frameQuantity: 50,
            key: 'bullet',
            active: false,
            visible: false,
            classType: Bullet
        });
    }

    fireBullet(x, y, angle, isSpecial = false) {
        let bullet = this.getFirstDead(false);
        if (bullet) {
            // isSpecial 用于追踪导弹 (isTracking) 或 重型炮弹 (外观变化)
            bullet.fire(x, y, angle, isSpecial);
            if (isSpecial) {
                bullet.setScale(2);
                bullet.setTint(0xff0000);
            } else {
                bullet.setScale(1);
                bullet.clearTint();
            }
        }
    }
}
