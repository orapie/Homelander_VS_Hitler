class BossHitlerFace extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        // 使用 'boss_face' 纹理，初始为第 0 帧 (Idle)
        super(scene, x, y, 'boss_face', 0);
        
        scene.add.existing(this);
        scene.physics.add.existing(this);

        // 1. 属性设置
        this.maxHp = 1250; // 原 5000 的 1/4
        this.hp = this.maxHp;
        this.phase = 1;
        this.isDead = false;
        
        // 2. 表情管理系统 (Expression System)
        this.expression = 'IDLE'; // IDLE, HURT, LAUGHING, ANGRY
        this.expressionTimer = 0;
        this.hurtDuration = 300; // 受击表情持续时间
        this.isHurt = false;

        // 3. 攻击逻辑定时器
        this.lastAttackTime = 0;
        this.stateTimer = 0;

        // 4. 物理设置
        this.setScale(4); // 巨大的脸
        this.body.setAllowGravity(false);
        this.body.setImmovable(true);
        this.body.setCollideWorldBounds(false); // 确保初始在世界外时不被挤压
        this.body.setSize(40, 40); // 调整碰撞箱以匹配缩放后的视觉

        // 5. 激光/攻击预警
        this.attackGraphics = scene.add.graphics();
        
        // 6. UI: Boss 血条
        this.createHealthBar();
    }

    createHealthBar() {
        const cam = this.scene.cameras.main;
        this.healthBarBg = this.scene.add.rectangle(cam.width / 2, 50, 600, 20, 0x000000).setScrollFactor(0);
        this.healthBar = this.scene.add.rectangle(cam.width / 2 - 300, 50, 600, 20, 0xff0000).setOrigin(0, 0.5).setScrollFactor(0);
        this.bossNameText = this.scene.add.text(cam.width / 2, 25, 'FINAL BOSS: THE FUHRER FACE', { 
            fontSize: '24px', 
            fill: '#fff',
            fontStyle: 'bold'
        }).setOrigin(0.5).setScrollFactor(0);
    }

    updateHealthBar() {
        const percent = Math.max(0, this.hp / this.maxHp);
        this.healthBar.width = 600 * percent;
    }

    // --- 表情切换逻辑 ---
    setExpression(expr) {
        if (this.isHurt && expr !== 'HURT') return; // 受击状态下不接受其他表情切换请求

        this.expression = expr;
        switch(expr) {
            case 'IDLE': this.setFrame(0); break;
            case 'HURT': this.setFrame(1); break;
            case 'LAUGHING': this.setFrame(2); break;
            case 'ANGRY': this.setFrame(3); break;
        }
    }

    takeDamage(amount) {
        if (this.isDead) return;
        
        this.hp -= amount;
        this.updateHealthBar();

        // --- 受击反馈 ---
        this.isHurt = true;
        this.setExpression('HURT');
        this.setTint(0xffffff); // 闪白
        
        // 视觉增强：受击抖动 (模拟胡须抖动和面部扭曲)
        this.scene.tweens.add({
            targets: this,
            x: this.x + Phaser.Math.Between(-5, 5),
            y: this.y + Phaser.Math.Between(-5, 5),
            duration: 50,
            yoyo: true,
            repeat: 3
        });

        // 粒子反馈
        this.createHurtParticles();

        // 恢复逻辑
        this.scene.time.delayedCall(this.hurtDuration, () => {
            if (!this.isDead) {
                this.isHurt = false;
                this.clearTint();
                // 恢复到当前阶段应有的表情
                this.restoreBaseExpression();
            }
        });

        this.checkPhaseTransition();

        if (this.hp <= 0) {
            this.die();
        }
    }

    restoreBaseExpression() {
        if (this.phase === 3) {
            this.setExpression('ANGRY');
        } else if (this.isAttacking) {
            this.setExpression('ANGRY');
        } else {
            this.setExpression('IDLE');
        }
    }

    createHurtParticles() {
        const emitter = this.scene.add.particles(this.x, this.y, 'particle', {
            speed: { min: -150, max: 150 },
            scale: { start: 1, end: 0 },
            blendMode: 'ADD',
            lifespan: 400,
            quantity: 5,
            emitting: false
        });
        emitter.explode(5);
    }

    checkPhaseTransition() {
        const percent = this.hp / this.maxHp;
        if (this.phase === 1 && percent <= 0.7) {
            this.phase = 2;
            this.onPhaseChange();
        } else if (this.phase === 2 && percent <= 0.3) {
            this.phase = 3;
            this.onPhaseChange();
        }
    }

    onPhaseChange() {
        this.scene.cameras.main.shake(500, 0.03);
        this.setExpression('ANGRY');
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        if (this.isDead) return;

        this.updateMovement(time, delta);
        this.updateAttacks(time, delta);
        this.updateRandomExpressions(time, delta);
    }

    updateRandomExpressions(time, delta) {
        if (this.isHurt || this.phase === 3 || this.isAttacking) return;

        // 在常态和嘲笑之间随机切换
        if (time > this.expressionTimer) {
            if (this.expression === 'IDLE') {
                if (Math.random() > 0.8) {
                    this.setExpression('LAUGHING');
                    this.expressionTimer = time + 1500;
                } else {
                    this.expressionTimer = time + 2000;
                }
            } else {
                this.setExpression('IDLE');
                this.expressionTimer = time + 3000;
            }
        }
    }

    updateMovement(time, delta) {
        const player = this.scene.player;
        
        if (this.phase === 1 || this.phase === 2) {
            // 悬浮在屏幕右侧
            const targetY = 300 + Math.sin(time / 800) * 80;
            this.y = Phaser.Math.Linear(this.y, targetY, 0.05);
            
            // 修正：使用 levelLength 或世界右边界。
            // targetX 应该是在关卡末尾附近（例如 4800 左右）
            const levelLength = this.scene.levelManager.levelLength;
            const targetX = levelLength - 200;
            this.x = Phaser.Math.Linear(this.x, targetX, 0.02);
        } else if (this.phase === 3) {
            // 疯狂撞击模式
            this.setExpression('ANGRY');
            this.setTint(0xff6666); // 变红
            
            if (!this.ramming) {
                const targetX = player.x + (Math.random() * 200 - 100);
                const targetY = player.y + (Math.random() * 200 - 100);
                this.scene.physics.moveTo(this, targetX, targetY, 600);
                this.ramming = true;
                
                this.scene.time.delayedCall(1000, () => {
                    this.setVelocity(0);
                    this.ramming = false;
                    // 随机吐炸弹
                    if (Math.random() > 0.4) this.spitBombs();
                });
            }
        }
    }

    updateAttacks(time, delta) {
        if (time < this.lastAttackTime + (this.phase === 3 ? 1200 : 2500)) return;

        this.isAttacking = true;
        if (this.phase === 1) {
            this.eyeLasers();
        } else if (this.phase === 2) {
            this.roarDanmaku();
        } else if (this.phase === 3) {
            this.roarDanmaku(true);
        }

        this.lastAttackTime = time;
    }

    // --- 技能 1: 目光凝视 (眼部发射) ---
    eyeLasers() {
        this.setExpression('ANGRY');
        const player = this.scene.player;
        
        // 左右眼各发射一颗导弹
        const eyeOffset = 15;
        this.scene.enemyBullets.fireBullet(this.x - eyeOffset, this.y - 10, 0, true);
        this.scene.enemyBullets.fireBullet(this.x + eyeOffset, this.y - 10, 0, true);
        
        this.scene.time.delayedCall(1000, () => {
            this.isAttacking = false;
            this.restoreBaseExpression();
        });
    }

    // --- 技能 2: 咆哮弹幕 (口部喷射) ---
    roarDanmaku(isFrenzy = false) {
        this.setExpression('LAUGHING');
        const count = isFrenzy ? 20 : 12;
        
        this.scene.time.addEvent({
            delay: 100,
            repeat: isFrenzy ? 5 : 2,
            callback: () => {
                for (let i = 0; i < count; i++) {
                    const angle = (Math.PI * 2 / count) * i + (Math.random() * 0.5);
                    this.scene.enemyBullets.fireBullet(this.x, this.y + 20, angle);
                }
                this.scene.cameras.main.shake(100, 0.01);
            }
        });

        this.scene.time.delayedCall(1500, () => {
            this.isAttacking = false;
            this.restoreBaseExpression();
        });
    }

    spitBombs() {
        this.scene.enemyBullets.fireBullet(this.x, this.y + 20, Math.PI / 2, true);
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        
        // 增加得分 (Boss 战加 5000 分)
        if (this.scene.addScore) {
            this.scene.addScore(5000);
        }

        this.body.enable = false;
        this.setExpression('HURT');
        this.setTint(0x000000); // 变黑

        // 连续大爆炸
        for (let i = 0; i < 15; i++) {
            this.scene.time.delayedCall(i * 150, () => {
                const rx = this.x + Phaser.Math.Between(-150, 150);
                const ry = this.y + Phaser.Math.Between(-150, 150);
                this.createExplosion(rx, ry);
                this.scene.cameras.main.shake(150, 0.03);
            });
        }

        // 结算画面
        this.scene.time.delayedCall(2500, () => {
            const cam = this.scene.cameras.main;
            this.scene.add.rectangle(cam.width / 2, cam.height / 2, 800, 600, 0x000000, 0.8).setScrollFactor(0);
            this.scene.add.text(cam.width / 2, cam.height / 2 - 50, 'MISSION ACCOMPLISHED', {
                fontSize: '64px',
                fill: '#ff0',
                fontStyle: 'bold'
            }).setOrigin(0.5).setScrollFactor(0);
            
            this.scene.add.text(cam.width / 2, cam.height / 2 + 50, `FINAL SCORE: ${this.scene.score}`, {
                fontSize: '32px',
                fill: '#fff'
            }).setOrigin(0.5).setScrollFactor(0);

            this.scene.add.text(cam.width / 2, cam.height / 2 + 150, 'CLICK TO RESTART', {
                fontSize: '20px',
                fill: '#888'
            }).setOrigin(0.5).setScrollFactor(0);

            this.scene.input.once('pointerdown', () => {
                this.scene.scene.restart();
            });
        });
    }

    createExplosion(x, y) {
        const emitter = this.scene.add.particles(x, y, 'particle', {
            speed: { min: -250, max: 250 },
            scale: { start: 2.5, end: 0 },
            blendMode: 'ADD',
            lifespan: 1200,
            quantity: 50,
            emitting: false
        });
        emitter.explode(50);
    }
}
