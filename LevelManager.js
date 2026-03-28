class LevelManager {
    constructor(scene) {
        this.scene = scene;
        this.platforms = scene.physics.add.staticGroup();
        this.destructibles = scene.physics.add.staticGroup();
        this.enemies = scene.physics.add.group();
        this.healthPacks = scene.physics.add.group();
        this.covers = scene.physics.add.staticGroup();
        this.chunkWidth = 800;
        this.currentX = 0;
        this.levelLength = 5000;
        this.arenaStartX = 4500;
        this.isBossTriggered = false;
        
        // 5-8 种不同的“关卡区块”
        this.chunkTemplates = [
            this.createFlatLand.bind(this),      // 平坦阵地
            this.createHighPlatform.bind(this),  // 高台哨所
            this.createTrench.bind(this),        // 战壕低谷
            this.createBrokenBridge.bind(this),  // 断桥
            this.createObstacleCourse.bind(this) // 障碍地带
        ];
    }

    generateLevel() {
        // 首先生成一个起始平地
        this.createFlatLand(0);
        this.currentX += this.chunkWidth;

        // 持续生成随机区块，直到接近竞技场区域
        while (this.currentX < this.arenaStartX - this.chunkWidth) {
            const randomIndex = Phaser.Math.Between(0, this.chunkTemplates.length - 1);
            this.chunkTemplates[randomIndex](this.currentX);
            this.currentX += this.chunkWidth;
        }

        // --- 生成 Boss 竞技场 ---
        this.createBossArena(this.arenaStartX);
        
        // 设置世界边界
        this.scene.physics.world.setBounds(0, 0, this.levelLength, 600);
        this.scene.cameras.main.setBounds(0, 0, this.levelLength, 600);

        // 死亡边界逻辑
        this.createDeathZone();
    }

    createBossArena(x) {
        // 巨大的固定平坦地面作为 Boss 竞技场
        const arenaWidth = this.levelLength - x;
        this.addPlatform(x + arenaWidth / 2, 580, arenaWidth, 40);
        
        // 增加掩体 (各地抵挡 Boss 弹幕)
        for (let i = 0; i < 3; i++) {
            const coverX = x + 400 + i * 400;
            const cover = this.covers.create(coverX, 500, 'cover').refreshBody();
            cover.setTint(0x00008B);
        }

        // 停止在竞技场生成随机物体的标记
        this.bossTriggerX = x;
    }

    checkBossTrigger(playerX) {
        if (!this.isBossTriggered && playerX > this.bossTriggerX) {
            this.isBossTriggered = true;
            this.triggerBoss();
        }
    }

    triggerBoss() {
        const cam = this.scene.cameras.main;
        
        // 1. 显示 "FINAL BOSS: THE FUHRER'S WRATH" 警告
        const warningText = this.scene.add.text(cam.centerX, cam.centerY, "FINAL BOSS:\nTHE FUHRER'S WRATH", {
            fontSize: '64px',
            fill: '#ff0000',
            fontStyle: 'bold',
            align: 'center',
            stroke: '#000',
            strokeThickness: 8
        }).setOrigin(0.5).setScrollFactor(0).setAlpha(0);

        // 淡入效果
        this.scene.tweens.add({
            targets: warningText,
            alpha: 1,
            duration: 1000,
            yoyo: true,
            hold: 1500,
            onComplete: () => {
                warningText.destroy();
                // 2. 生成 Boss
                const bossX = this.levelLength + 400; // 离右侧稍微远一点，确保进场平滑
                const bossY = 300;
                this.scene.boss = new BossHitlerFace(this.scene, bossX, bossY);
                this.scene.boss.setExpression('LAUGHING');
                
                // 锁定左侧边界，防止玩家往回跑
                this.scene.physics.world.setBounds(this.bossTriggerX, 0, this.levelLength - this.bossTriggerX, 600);
                cam.setBounds(this.bossTriggerX, 0, this.levelLength - this.bossTriggerX, 600);
            }
        });
        
        cam.shake(1000, 0.02);
    }

    // --- 区块模板 ---

    createFlatLand(x) {
        // 基础地面
        this.addPlatform(x + 400, 580, 800, 40);
        // 随机放置木箱或油桶
        if (Math.random() > 0.5) this.addCrate(x + 200, 540);
        if (Math.random() > 0.7) this.addOilDrum(x + 600, 540);
    }

    createHighPlatform(x) {
        this.addPlatform(x + 400, 580, 800, 40);
        this.addPlatform(x + 200, 450, 200, 20);
        this.addPlatform(x + 600, 350, 200, 20);
        this.addCrate(x + 600, 320);
        
        // 在高台放置炮兵
        this.addEnemy(x + 200, 410, 'artillery');
    }

    createTrench(x) {
        // 分段地面形成低谷
        this.addPlatform(x + 100, 580, 200, 40);
        this.addPlatform(x + 700, 580, 200, 40);
        // 低谷中有少量木箱
        this.addCrate(x + 400, 580); 
        
        // 在低谷上方生成飞机
        this.addEnemy(x + 400, 100, 'plane');
    }

    createBrokenBridge(x) {
        this.addPlatform(x + 150, 500, 300, 20);
        this.addPlatform(x + 650, 500, 300, 20);
        // 桥上放置步兵
        this.addEnemy(x + 150, 460, 'infantry');
    }

    createObstacleCourse(x) {
        this.addPlatform(x + 400, 580, 800, 40);
        // 密集的木箱和油桶
        for (let i = 0; i < 3; i++) {
            this.addCrate(x + 200 + i * 150, 540);
            if (i === 1) this.addOilDrum(x + 200 + i * 150 + 75, 540);
        }
        
        // 放置坦克
        this.addEnemy(x + 600, 540, 'tank');
    }

    // --- 辅助方法 ---

    addPlatform(x, y, width, height) {
        const platform = this.platforms.create(x, y, 'ground').setScale(width, height).refreshBody();
        platform.setTint(0x333333); // 深灰色
        return platform;
    }

    addCrate(x, y) {
        const crate = new Crate(this.scene, x, y);
        this.destructibles.add(crate);
    }

    addOilDrum(x, y) {
        const oilDrum = new OilDrum(this.scene, x, y);
        this.destructibles.add(oilDrum);
    }

    addEnemy(x, y, type) {
        let enemy;
        switch(type) {
            case 'infantry': enemy = new Infantry(this.scene, x, y); break;
            case 'tank': enemy = new Tank(this.scene, x, y); break;
            case 'plane': enemy = new Plane(this.scene, x, y); break;
            case 'artillery': enemy = new Artillery(this.scene, x, y); break;
        }
        if (enemy) this.enemies.add(enemy);
    }

    dropHealthPack(x, y) {
        const pack = this.healthPacks.create(x, y, 'health_pack');
        pack.body.setGravityY(300);
        pack.body.setBounce(0.3);
        pack.body.setCollideWorldBounds(true);
    }

    createDeathZone() {
        // 在最下方创建一个大的传感器，用于检测玩家掉落
        // 或者在 update 中简单判断 player.y > 600
    }
}
