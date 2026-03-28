class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        // 使用新纹理 homelander
        super(scene, x, y, 'homelander');

        this.setOrigin(0.5, 0.5); // 飞行角色通常中心对齐
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        this.body.setAllowGravity(false); // 自由飞行
        
        // 属性提升
        this.maxHp = 200;
        this.hp = this.maxHp;
        this.moveSpeed = 400;
        this.isCrouching = false;
        
        // 连发设置
        this.fireRate = 100; // 激光伤害频率 (ms)
        this.lastFiredTime = 0;

        // 持续激光图形
        this.laserGraphics = scene.add.graphics();
        this.laserGraphics.setDepth(10);

        // 输入控制
        this.keys = scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });

        // 保存原始碰撞箱大小
        this.originalWidth = this.width;
        this.originalHeight = this.height;
    }

    takeDamage(amount) {
        this.hp -= amount;
        
        this.setTint(0xff0000);
        this.scene.time.delayedCall(100, () => {
            this.clearTint();
        });

        if (this.hp <= 0) {
            this.scene.scene.restart();
        }
    }

    heal(amount) {
        this.hp = Math.min(this.maxHp, this.hp + amount);
        this.setTint(0x00ff00);
        this.scene.time.delayedCall(200, () => this.clearTint());
    }

    update() {
        // --- 自由飞行移动 ---
        let vx = 0;
        let vy = 0;

        if (this.keys.left.isDown) vx = -this.moveSpeed;
        else if (this.keys.right.isDown) vx = this.moveSpeed;

        if (this.keys.up.isDown) vy = -this.moveSpeed;
        else if (this.keys.down.isDown) vy = this.moveSpeed;

        this.setVelocity(vx, vy);

        // --- 翻转方向 ---
        if (vx !== 0) {
            this.setFlipX(vx < 0);
        }

        // --- 持续激光逻辑 ---
        this.laserGraphics.clear();
        const pointer = this.scene.input.activePointer;
        
        if (pointer.isDown) {
            this.drawContinuousLaser(pointer);
        }
    }

    drawContinuousLaser(pointer) {
        const eyeX = this.x;
        const eyeY = this.y - 20;
        
        // 目标方向 (世界坐标)
        const targetX = pointer.worldX;
        const targetY = pointer.worldY;
        
        // 计算最大射程线 (2000 像素)
        const angle = Phaser.Math.Angle.Between(eyeX, eyeY, targetX, targetY);
        const maxDist = 2000;
        let endX = eyeX + Math.cos(angle) * maxDist;
        let endY = eyeY + Math.sin(angle) * maxDist;

        // --- 射线碰撞检测 (找出最近的碰撞点) ---
        let closestDist = maxDist;
        let hitTarget = null;

        // 1. 检测掩体 (完全阻挡)
        this.scene.levelManager.covers.children.each((cover) => {
            const intersection = this.getLineRectangleIntersection(eyeX, eyeY, endX, endY, cover);
            if (intersection) {
                const dist = Phaser.Math.Distance.Between(eyeX, eyeY, intersection.x, intersection.y);
                if (dist < closestDist) {
                    closestDist = dist;
                    endX = intersection.x;
                    endY = intersection.y;
                    hitTarget = 'cover';
                }
            }
        });

        // 2. 检测 Boss (如果存在且未死亡)
        if (this.scene.boss && !this.scene.boss.isDead) {
            const intersection = this.getLineRectangleIntersection(eyeX, eyeY, endX, endY, this.scene.boss);
            if (intersection) {
                const dist = Phaser.Math.Distance.Between(eyeX, eyeY, intersection.x, intersection.y);
                if (dist < closestDist) {
                    closestDist = dist;
                    endX = intersection.x;
                    endY = intersection.y;
                    hitTarget = this.scene.boss;
                }
            }
        }

        // 3. 检测普通敌人
        this.scene.levelManager.enemies.children.each((enemy) => {
            if (enemy.active) {
                const intersection = this.getLineRectangleIntersection(eyeX, eyeY, endX, endY, enemy);
                if (intersection) {
                    const dist = Phaser.Math.Distance.Between(eyeX, eyeY, intersection.x, intersection.y);
                    if (dist < closestDist) {
                        closestDist = dist;
                        // 这里不截断射线，激光可以穿透敌人，除非你希望它不穿透
                        // 如果希望不穿透，取消下面两行的注释
                        // endX = intersection.x;
                        // endY = intersection.y;
                        
                        // 记录伤害
                        this.applyLaserDamage(enemy);
                    }
                }
            }
        });

        // 4. 检测可破坏物
        this.scene.destructibles.children.each((item) => {
            if (item.active) {
                const intersection = this.getLineRectangleIntersection(eyeX, eyeY, endX, endY, item);
                if (intersection) {
                    const dist = Phaser.Math.Distance.Between(eyeX, eyeY, intersection.x, intersection.y);
                    if (dist < closestDist) {
                        closestDist = dist;
                        // endX = intersection.x; // 可选：是否被木箱阻挡
                        // endY = intersection.y;
                        this.applyLaserDamage(item);
                    }
                }
            }
        });

        // 如果击中了 Boss，也记录伤害
        if (hitTarget && hitTarget !== 'cover' && hitTarget !== 'platform') {
            this.applyLaserDamage(hitTarget);
        }

        // --- 绘制激光视觉效果 ---
        // 增加一点脉冲感
        const pulse = Math.sin(this.scene.time.now / 50) * 2;
        
        // 外层红光 (模糊感)
        this.laserGraphics.lineStyle(6 + pulse, 0xff0000, 0.3);
        this.laserGraphics.strokeLineShape(new Phaser.Geom.Line(eyeX, eyeY, endX, endY));
        
        // 内层核心白/亮红光
        this.laserGraphics.lineStyle(2 + pulse/2, 0xffffff, 1);
        this.laserGraphics.strokeLineShape(new Phaser.Geom.Line(eyeX, eyeY, endX, endY));

        // 击中点火花效果
        if (closestDist < maxDist) {
            this.createLaserHitEffect(endX, endY);
        }
    }

    // 辅助方法：获取射线与矩形(Sprite body)的交点
    getLineRectangleIntersection(x1, y1, x2, y2, sprite) {
        const line = new Phaser.Geom.Line(x1, y1, x2, y2);
        const rect = sprite.getBounds();
        
        // 获取矩形的四条边
        const lines = [
            new Phaser.Geom.Line(rect.left, rect.top, rect.right, rect.top),
            new Phaser.Geom.Line(rect.right, rect.top, rect.right, rect.bottom),
            new Phaser.Geom.Line(rect.right, rect.bottom, rect.left, rect.bottom),
            new Phaser.Geom.Line(rect.left, rect.bottom, rect.left, rect.top)
        ];

        let closestPoint = null;
        let minDist = Infinity;

        lines.forEach(l => {
            const point = new Phaser.Geom.Point();
            if (Phaser.Geom.Intersects.LineToLine(line, l, point)) {
                const d = Phaser.Math.Distance.Between(x1, y1, point.x, point.y);
                if (d < minDist) {
                    minDist = d;
                    closestPoint = point;
                }
            }
        });

        return closestPoint;
    }

    applyLaserDamage(target) {
        const currentTime = this.scene.time.now;
        // 使用目标自身的属性记录上次受击时间，实现独立频率控制
        if (!target.lastLaserHitTime || currentTime > target.lastLaserHitTime + this.fireRate) {
            if (target.takeDamage) {
                target.takeDamage(10);
                target.lastLaserHitTime = currentTime;
            }
        }
    }

    createLaserHitEffect(x, y) {
        if (Math.random() > 0.5) {
            const emitter = this.scene.add.particles(x, y, 'particle', {
                color: [0xff0000, 0xffff00],
                speed: { min: -100, max: 100 },
                scale: { start: 0.5, end: 0 },
                lifespan: 200,
                quantity: 2,
                emitting: false
            });
            emitter.explode(2);
            // 粒子系统会累积，建议在这里做简单的优化或使用已有的 emitter
        }
    }
}
