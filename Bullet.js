class Bullet extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        // 初始使用圆形图形作为占位符
        super(scene, x, y, 'bullet');
    }

    fire(x, y, angle, isTracking = false) {
        this.enableBody(true, x, y, true, true);
        this.isTracking = isTracking;
        this.lifeTimer = 0; // 追踪弹生命周期计时器
        
        // 子弹不受重力影响，实现直线飞行
        this.body.setAllowGravity(false);
        
        // 设置子弹旋转
        this.setRotation(angle);

        // 根据角度设置速度 (800 为子弹速度)
        const speed = this.isTracking ? 200 : 800; // 追踪导弹速度慢一点
        this.scene.physics.velocityFromRotation(angle, speed, this.body.velocity);
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);

        if (this.active && this.isTracking) {
            this.lifeTimer += delta;
            if (this.lifeTimer > 2000) { // 2秒自动消失
                this.disableBody(true, true);
                return;
            }
            const player = this.scene.player;
            const targetAngle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
            // 缓慢转向玩家
            const currentAngle = this.rotation;
            const newAngle = Phaser.Math.Angle.RotateTo(currentAngle, targetAngle, 0.02);
            this.setRotation(newAngle);
            this.scene.physics.velocityFromRotation(newAngle, 200, this.body.velocity);
        }

        // 如果超出屏幕边界，则回收子弹
        const bounds = this.scene.cameras.main.worldView;
        if (!bounds.contains(this.x, this.y)) {
            this.disableBody(true, true);
        }
    }
}

// 子弹组/对象池管理
class Bullets extends Phaser.Physics.Arcade.Group {
    constructor(scene) {
        super(scene.physics.world, scene);

        this.createMultiple({
            frameQuantity: 30, // 初始池大小
            key: 'bullet',
            active: false,
            visible: false,
            classType: Bullet
        });
    }

    fireBullet(x, y, angle, isTracking = false) {
        let bullet = this.getFirstDead(false);

        if (bullet) {
            bullet.fire(x, y, angle, isTracking);
        }
    }
}
