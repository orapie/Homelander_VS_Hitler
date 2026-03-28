const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1000 },
            debug: false // 开启调试模式可以看到碰撞箱
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

function preload() {
    // --- 视觉占位：生成临时纹理 ---
    const graphics = this.make.graphics();

    // 玩家：矩形 (32x64)
    graphics.fillStyle(0x00ff00, 1);
    graphics.fillRect(0, 0, 32, 64);
    graphics.generateTexture('player', 32, 64);
    graphics.clear();

    // 子弹：圆形 (8x8)
    graphics.fillStyle(0xffff00, 1);
    graphics.fillCircle(4, 4, 4);
    graphics.generateTexture('bullet', 8, 8);
    graphics.clear();

    // 玩家激光眼子弹：红色细长条 (12x4)
    graphics.fillStyle(0xff0000, 1);
    graphics.fillRect(0, 0, 12, 4);
    graphics.generateTexture('eye_laser', 12, 4);
    graphics.clear();

    // 医疗包 (Health Pack): 白色背景红色十字 (20x20)
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(0, 0, 20, 20);
    graphics.fillStyle(0xff0000, 1);
    graphics.fillRect(8, 2, 4, 16);
    graphics.fillRect(2, 8, 16, 4);
    graphics.generateTexture('health_pack', 20, 20);
    graphics.clear();

    // 掩体 (Cover): 深蓝色大方块 (60x100)
    graphics.fillStyle(0x00008B, 1);
    graphics.fillRect(0, 0, 60, 100);
    graphics.generateTexture('cover', 60, 100);
    graphics.clear();

    // 祖国人玩家纹理 (32x64)
    // 蓝色制服，红色斗篷，金色腰带
    graphics.fillStyle(0x0000ff, 1); // 蓝色制服
    graphics.fillRect(0, 0, 32, 64);
    graphics.fillStyle(0xff0000, 1); // 红色斗篷 (背面/侧面占位)
    graphics.fillRect(0, 0, 8, 64);
    graphics.fillStyle(0xffd700, 1); // 金色腰带
    graphics.fillRect(0, 32, 32, 4);
    graphics.fillStyle(0xffdbac, 1); // 头部
    graphics.fillRect(6, 0, 20, 15);
    graphics.generateTexture('homelander', 32, 64);
    graphics.clear();

    // 粒子：圆形 (4x4)
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(2, 2, 2);
    graphics.generateTexture('particle', 4, 4);
    graphics.clear();

    // 地面：矩形
    graphics.fillStyle(0x666666, 1);
    graphics.fillRect(0, 0, 1, 1);
    graphics.generateTexture('ground', 1, 1);
    graphics.clear();

    // 木箱 (Crate): 棕色 (40x40)
    graphics.fillStyle(0x8B4513, 1);
    graphics.fillRect(0, 0, 40, 40);
    graphics.generateTexture('crate', 40, 40);
    graphics.clear();

    // 油桶 (Oil Drum): 红色 (30x45)
    graphics.fillStyle(0xFF0000, 1);
    graphics.fillRect(0, 0, 30, 45);
    graphics.generateTexture('oil_drum', 30, 45);
    graphics.clear();

    // 敌人：步兵 (32x64) - 深红色
    graphics.fillStyle(0x8B0000, 1);
    graphics.fillRect(0, 0, 32, 64);
    graphics.generateTexture('infantry', 32, 64);
    graphics.clear();

    // 敌人：坦克 (64x40) - 墨绿色
    graphics.fillStyle(0x556B2F, 1);
    graphics.fillRect(0, 0, 64, 40);
    graphics.generateTexture('tank', 64, 40);
    graphics.clear();

    // 敌人：飞机 (60x20) - 灰色
    graphics.fillStyle(0x808080, 1);
    graphics.fillRect(0, 0, 60, 20);
    graphics.generateTexture('plane', 60, 20);
    graphics.clear();

    // 敌人：炮兵 (40x40) - 深灰色
    graphics.fillStyle(0x2F4F4F, 1);
    graphics.fillRect(0, 0, 40, 40);
    graphics.generateTexture('artillery', 40, 40);
    graphics.clear();

    // --- Boss 希特勒大脸表情 Spritesheet 生成 (40x40 每帧) ---
    // 特征说明：肉色圆脸、黑色侧分发、灰色军帽、黑色小方块胡须、蓝色眼睛
    
    const drawFaceBase = (gx, ox) => {
        // 1. 脸 (肉色圆脸)
        gx.fillStyle(0xffdbac, 1);
        gx.fillCircle(ox + 20, 25, 15);
        
        // 2. 侧分发 (黑色)
        gx.fillStyle(0x000000, 1);
        gx.beginPath();
        gx.moveTo(ox + 5, 20);
        gx.lineTo(ox + 35, 20);
        gx.lineTo(ox + 30, 10);
        gx.lineTo(ox + 10, 10);
        gx.closePath();
        gx.fill();

        // 3. 军帽 (灰色长方形)
        gx.fillStyle(0x808080, 1);
        gx.fillRect(ox + 8, 5, 24, 8);
        // 军帽装饰 (黄色小点)
        gx.fillStyle(0xffff00, 1);
        gx.fillCircle(ox + 20, 8, 2);

        // 4. 小胡子 (黑色小方块)
        gx.fillStyle(0x000000, 1);
        gx.fillRect(ox + 17, 28, 6, 4);
    };

    // Frame 0: Idle (严厉)
    drawFaceBase(graphics, 0);
    graphics.fillStyle(0x0000ff, 1); // 蓝色眼睛
    graphics.fillCircle(14, 22, 2);
    graphics.fillCircle(26, 22, 2);
    graphics.fillStyle(0x000000, 1);
    graphics.fillRect(12, 34, 16, 1); // 嘴

    // Frame 1: Hurt (痛苦 - 双眼充血，胡须抖动)
    drawFaceBase(graphics, 40);
    // 充血眼睛 (红色)
    graphics.fillStyle(0xff0000, 1);
    graphics.fillCircle(54, 22, 2);
    graphics.fillCircle(66, 22, 2);
    // 嘴巴扭曲
    graphics.lineStyle(1, 0x000, 1);
    graphics.beginPath();
    graphics.moveTo(52, 35); graphics.lineTo(68, 33);
    graphics.strokePath();
    // 胡须抖动效果在 BossHitlerFace.js 中通过震动实现，这里绘制稍微偏移一点
    graphics.fillStyle(0x000000, 1);
    graphics.fillRect(58, 27, 6, 4);

    // Frame 2: Laughing (嘲笑 - 大嘴)
    drawFaceBase(graphics, 80);
    graphics.fillStyle(0x0000ff, 1); // 蓝色眼睛 (眯起)
    graphics.fillRect(92, 21, 4, 2);
    graphics.fillRect(104, 21, 4, 2);
    graphics.fillStyle(0x000, 1);
    graphics.fillEllipse(100, 35, 10, 6); // 张大的嘴

    // Frame 3: Angry (愤怒 - 冒火)
    drawFaceBase(graphics, 120);
    graphics.fillStyle(0xffa500, 1); // 橙色火眼
    graphics.fillCircle(134, 22, 3);
    graphics.fillCircle(146, 22, 3);
    graphics.fillStyle(0x000, 1);
    graphics.fillRect(132, 34, 16, 2); // 紧闭的嘴

    // 生成纹理并切分为 Spritesheet
    graphics.generateTexture('boss_face_sheet', 160, 40);
    this.textures.addSpriteSheet('boss_face', this.textures.get('boss_face_sheet').getSourceImage(), {
        frameWidth: 40,
        frameHeight: 40
    });
    graphics.clear();

    // 背景层生成 (这里生成简单的占位符，实际会用图片)
    // 远景层 (bg_far)
    graphics.fillStyle(0x1a1a1a, 1);
    graphics.fillRect(0, 0, 800, 600);
    graphics.generateTexture('bg_far', 800, 600);
    graphics.clear();

    // 中景层 (bg_mid): 破损建筑占位 (带一些条纹)
    graphics.fillStyle(0x333333, 1);
    graphics.fillRect(0, 0, 800, 300);
    graphics.lineStyle(2, 0x444444, 1);
    for (let i = 0; i < 800; i += 40) {
        graphics.moveTo(i, 0);
        graphics.lineTo(i, 300);
    }
    graphics.strokePath();
    graphics.generateTexture('bg_mid', 800, 300);
    graphics.clear();
}

function create() {
    // --- 视差滚动背景初始化 ---
    // 使用 TileSprite 以支持平铺滚动
    this.bgFar = this.add.tileSprite(400, 300, 800, 600, 'bg_far').setScrollFactor(0);
    this.bgMid = this.add.tileSprite(400, 450, 800, 300, 'bg_mid').setScrollFactor(0);

    // --- 初始化关卡管理器 ---
    this.levelManager = new LevelManager(this);
    this.levelManager.generateLevel(); // 生成关卡

    // 别名方便访问
    this.platforms = this.levelManager.platforms;
    this.destructibles = this.levelManager.destructibles;

    // --- 初始化子弹组 ---
    this.bullets = new Bullets(this);
    this.enemyBullets = new EnemyBullets(this);

    // --- 初始化玩家 ---
    this.player = new Player(this, 100, 400);
    this.score = 0;

    // 将全局函数绑定到场景实例，以便在其他类（如 Enemy）中访问
    this.setupUI = setupUI.bind(this);
    this.updateUI = updateUI.bind(this);
    this.addScore = addScore.bind(this);
    this.onPlayerHit = onPlayerHit.bind(this);

    // --- 初始化 UI ---
    this.setupUI();

    // --- 碰撞检测设置 ---
    // 1. 玩家与平台
    this.physics.add.collider(this.player, this.platforms);
    // 2. 玩家与可破坏物
    this.physics.add.collider(this.player, this.destructibles);
    // 玩家与掩体 (阻挡移动)
    this.physics.add.collider(this.player, this.levelManager.covers);
    
    // 玩家撞击敌人造成伤害 (祖国人撞击逻辑)
    this.physics.add.overlap(this.player, this.levelManager.enemies, (player, enemy) => {
        // 如果玩家速度较快，造成大量伤害
        const speed = Math.sqrt(player.body.velocity.x**2 + player.body.velocity.y**2);
        if (speed > 100) {
            enemy.takeDamage(50);
            // 撞击反馈
            player.setVelocity(player.body.velocity.x * -0.2, player.body.velocity.y * -0.2);
        }
    });

    // 玩家吃医疗包
    this.physics.add.overlap(this.player, this.levelManager.healthPacks, (player, pack) => {
        player.heal(50);
        pack.destroy();
    });

    // 医疗包落在平台上
    this.physics.add.collider(this.levelManager.healthPacks, this.platforms);

    // 3. 敌人与平台
    this.physics.add.collider(this.levelManager.enemies, this.platforms);
    this.physics.add.collider(this.levelManager.enemies, this.destructibles);

    // 4. 子弹与环境
    this.physics.add.collider(this.enemyBullets, this.platforms, (bullet) => bullet.disableBody(true, true));
    
    // 子弹与掩体 (无法穿透)
    this.physics.add.collider(this.enemyBullets, this.levelManager.covers, (bullet) => bullet.disableBody(true, true));

    // 6. 敌人子弹击中玩家
    this.physics.add.overlap(this.player, this.enemyBullets, (player, bullet) => {
        bullet.disableBody(true, true);
        player.takeDamage(10);
        this.onPlayerHit();
    });

    // --- 摄像机设置 ---
    const cam = this.cameras.main;
    cam.startFollow(this.player, true, 0.1, 0.1);
}

function update() {
    // 死亡边界检测
    if (this.player.y > 600) {
        this.scene.restart();
    }

    // 调用玩家逻辑
    this.player.update();

    // --- Boss 触发与摄像机逻辑 ---
    this.levelManager.checkBossTrigger(this.player.x);

    const cam = this.cameras.main;
    if (this.boss && !this.boss.isDead) {
        // --- 竞技场锁定与视角居中 ---
        // 摄像机在玩家和 Boss 之间平滑居中
        const midX = (this.player.x + this.boss.x) / 2;
        const midY = (this.player.y + this.boss.y) / 2;
        
        // 停止 startFollow，改用手动控制或调整 followOffset
        // 为了实现“在玩家和 Boss 之间平滑居中”，我们调整摄像机的跟随目标或偏移
        // 这里最简单的方法是让摄像机跟随一个虚拟点，或者直接设置 scrollX
        const targetScrollX = midX - cam.width / 2;
        const targetScrollY = midY - cam.height / 2;
        
        // 限制在竞技场范围内
        const lerpX = Phaser.Math.Linear(cam.scrollX, targetScrollX, 0.05);
        const lerpY = Phaser.Math.Linear(cam.scrollY, targetScrollY, 0.05);
        cam.setScroll(lerpX, lerpY);
    } else {
        // --- 普通跟随逻辑 ---
        const pointer = this.input.activePointer;
        const offsetX = (pointer.worldX - this.player.x) * 0.25;
        const offsetY = (pointer.worldY - (this.player.y - 20)) * 0.25; // 使用头部位置偏移 (同激光眼位置)
        cam.setFollowOffset(-offsetX, -offsetY);
    }

    // --- 视差滚动更新 ---
    // 通过调整 tilePosition 实现位移差
    this.bgFar.tilePositionX = cam.scrollX * 0.1;
    this.bgMid.tilePositionX = cam.scrollX * 0.4;

    // 更新 UI 位置
    this.updateUI();
}

function setupUI() {
    // 血条背景
    this.healthBarBg = this.add.rectangle(20, 20, 200, 20, 0x000000).setOrigin(0).setScrollFactor(0);
    // 血条
    this.healthBar = this.add.rectangle(20, 20, 200, 20, 0xff0000).setOrigin(0).setScrollFactor(0);
    // 得分
    this.scoreText = this.add.text(780, 20, 'SCORE: 0', { fontSize: '24px', fill: '#fff' }).setOrigin(1, 0).setScrollFactor(0);
}

function updateUI() {
    // 祖国人最大血量 200
    const healthPercent = Math.max(0, this.player.hp / 200);
    this.healthBar.width = 200 * healthPercent;
}

function addScore(amount) {
    this.score += amount;
    this.scoreText.setText(`SCORE: ${this.score}`);
    console.log(`Score added: ${amount}, Total score: ${this.score}`);
}

function onPlayerHit() {
    // 屏幕闪红
    this.cameras.main.flash(100, 255, 0, 0);
    // 震动
    this.cameras.main.shake(200, 0.01);
}
