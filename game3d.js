// 游戏配置
const config = {
    gridSize: 40,         // 地图大小（格子数）
    gameSpeed: 100,
    initialSnakeLength: 3,
    segmentRadius: 0.5,  // 蛇身体段的半径
    segmentSpacing: 0.2,  // 蛇身体段之间的间距
    rotationFoodCount: 1,  // 每吃到多少个食物触发旋转
    currentFoodCount: 0    // 当前已吃到的食物计数
};

// 游戏状态
let snake = [];
let food = null;
let direction = 'right';
let nextDirection = 'right';
let score = 0;
let gameLoop = null;

// Three.js 相关变量
let scene, camera, renderer;
let snakeSegments = [];
let foodMesh;
let gameContainer; // 新增：游戏容器

// 初始化Three.js场景
function initThreeJS() {
    // 创建场景
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // 天空蓝色背景

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 40, 40);
    camera.lookAt(0, 0, 0);

    // 添加相机平滑过渡效果
    const targetCameraPosition = { x: 0, y: 40, z: 40 };
    new TWEEN.Tween(camera.position)
        .to(targetCameraPosition, 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-container').appendChild(renderer.domElement);

    // 创建游戏容器
    gameContainer = new THREE.Group();
    scene.add(gameContainer);

    // 添加环境光和平行光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    scene.add(directionalLight);

    // 创建地面
    const groundGeometry = new THREE.PlaneGeometry(40, 40);
    const groundMaterial = new THREE.MeshPhongMaterial({
        color: 0x90EE90,
        side: THREE.DoubleSide
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    gameContainer.add(ground);

    // 添加装饰性树木
    addDecorations();
}

// 创建蛇的身体段
function createSnakeSegment(position) {
    const group = new THREE.Group();

    // 身体主体
    const bodyGeometry = new THREE.SphereGeometry(config.segmentRadius, 32, 32);
    const bodyMaterial = new THREE.MeshPhongMaterial({
        color: 0x4CAF50,
        specular: 0x050505,
        shininess: 100
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    group.add(body);

    // 添加眼睛（只给头部添加）
    if (position === snake[0]) {
        const eyeGeometry = new THREE.SphereGeometry(0.1, 16, 16);
        const eyeMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
        const pupilMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });

        // 左眼
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(0.2, 0.2, 0.3);
        const leftPupil = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), pupilMaterial);
        leftPupil.position.set(0.22, 0.2, 0.35);
        group.add(leftEye);
        group.add(leftPupil);

        // 右眼
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(-0.2, 0.2, 0.3);
        const rightPupil = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), pupilMaterial);
        rightPupil.position.set(-0.22, 0.2, 0.35);
        group.add(rightEye);
        group.add(rightPupil);
    }

    group.position.set(
        position.x - config.gridSize / 2,
        config.segmentRadius,
        position.y - config.gridSize / 2
    );

    scene.add(group);
    return group;
}

// 游戏中的树木数组
let trees = [];
let mushrooms = [];

// 添加装饰性元素
function addDecorations() {
    // 清除现有的树木和蘑菇
    trees.forEach(tree => {
        gameContainer.remove(tree);
        scene.remove(tree);
    });
    mushrooms.forEach(mushroom => {
        gameContainer.remove(mushroom);
        scene.remove(mushroom);
    });
    trees = [];
    mushrooms = [];

    // 随机生成5-10棵树
    const treeCount = Math.floor(Math.random() * 6) + 5;
    // 随机生成6-9个蘑菇，确保有足够空间放置毒蘑菇
    const mushroomCount = Math.floor(Math.random() * 4) + 6;
    const gridSize = config.gridSize;
    const occupiedPositions = new Set();

    // 记录蛇的初始位置
    const snakeInitialPositions = new Set();
    for (let i = 0; i < config.initialSnakeLength; i++) {
        snakeInitialPositions.add(`${i},0`);
    }

    // 添加树木
    for (let i = 0; i < treeCount; i++) {
        let x, z;
        let attempts = 0;
        const maxAttempts = 50;

        // 尝试找到合适的位置
        do {
            x = Math.floor(Math.random() * (gridSize - 4)) + 2;
            z = Math.floor(Math.random() * (gridSize - 4)) + 2;
            attempts++;

            // 如果尝试次数过多，跳过这棵树
            if (attempts > maxAttempts) continue;

        } while (
            occupiedPositions.has(`${x},${z}`) ||
            snakeInitialPositions.has(`${x},${z}`) ||
            // 确保树木之间有足够距离
            Array.from(occupiedPositions).some(pos => {
                const [ox, oz] = pos.split(',').map(Number);
                return Math.abs(ox - x) < 2 && Math.abs(oz - z) < 2;
            })
        );

        if (attempts <= maxAttempts) {
            const treeGroup = new THREE.Group();

            // 树干
            const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 1, 8);
            const trunkMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.castShadow = true;
            treeGroup.add(trunk);

            // 树冠
            const leavesGeometry = new THREE.ConeGeometry(1, 2, 8);
            const leavesMaterial = new THREE.MeshPhongMaterial({ color: 0x228B22 });
            const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
            leaves.position.y = 1.5;
            leaves.castShadow = true;
            treeGroup.add(leaves);

            // 设置树木位置
            treeGroup.position.set(
                x - gridSize / 2,
                0,
                z - gridSize / 2
            );

            // 添加碰撞检测所需的属性
            treeGroup.userData = { gridX: x, gridZ: z };

            gameContainer.add(treeGroup);
            trees.push(treeGroup);
            occupiedPositions.add(`${x},${z}`);
        }
    }

    // 添加蘑菇
    let poisonousCount = 0;
    const minPoisonousCount = 3; // 最少毒蘑菇数量

    for (let i = 0; i < mushroomCount; i++) {
        // 确保前三个蘑菇是毒蘑菇，之后的按40%概率生成毒蘑菇
        const isPoisonous = i < minPoisonousCount ? true : Math.random() < 0.4;
        let x, z;
        let attempts = 0;
        const maxAttempts = 50;

        do {
            x = Math.floor(Math.random() * (gridSize - 4)) + 2;
            z = Math.floor(Math.random() * (gridSize - 4)) + 2;
            attempts++;

            if (attempts > maxAttempts) continue;

        } while (
            occupiedPositions.has(`${x},${z}`) ||
            snakeInitialPositions.has(`${x},${z}`) ||
            Array.from(occupiedPositions).some(pos => {
                const [ox, oz] = pos.split(',').map(Number);
                return Math.abs(ox - x) < 2 && Math.abs(oz - z) < 2;
            })
        );

        if (attempts <= maxAttempts) {
            const mushroomGroup = new THREE.Group();

            // 蘑菇柄
            const stemGeometry = new THREE.CylinderGeometry(0.15, 0.2, 0.6, 8);
            const stemMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
            const stem = new THREE.Mesh(stemGeometry, stemMaterial);
            stem.castShadow = true;
            mushroomGroup.add(stem);

            // 蘑菇帽
            const capGeometry = new THREE.SphereGeometry(0.5, 16, 16);
            capGeometry.scale(1, 0.5, 1);
            const capMaterial = new THREE.MeshPhongMaterial({
                color: isPoisonous ? 0x800080 : 0xFF0000, // 毒蘑菇为紫色
                emissive: isPoisonous ? 0x400040 : 0x330000,
                emissiveIntensity: 0.2
            });
            const cap = new THREE.Mesh(capGeometry, capMaterial);
            cap.position.y = 0.4;
            cap.castShadow = true;

            // 添加白色斑点
            const spotGeometry = new THREE.CircleGeometry(0.08, 8);
            const spotMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
            for (let j = 0; j < 5; j++) {
                const spot = new THREE.Mesh(spotGeometry, spotMaterial);
                spot.rotation.x = -Math.PI / 2;
                spot.position.y = 0.41;
                spot.position.x = Math.cos(j * Math.PI * 0.4) * 0.25;
                spot.position.z = Math.sin(j * Math.PI * 0.4) * 0.25;
                cap.add(spot);
            }

            mushroomGroup.add(cap);

            // 设置蘑菇位置
            mushroomGroup.position.set(
                x - gridSize / 2,
                0,
                z - gridSize / 2
            );

            // 添加碰撞检测所需的属性
            mushroomGroup.userData = { gridX: x, gridZ: z, isPoisonous: isPoisonous };

            gameContainer.add(mushroomGroup);
            mushrooms.push(mushroomGroup);
            occupiedPositions.add(`${x},${z}`);

            if (isPoisonous) {
                poisonousCount++;
            }
        }
    }
}

// 创建食物
function createFood(position) {
    if (foodMesh) {
        gameContainer.remove(foodMesh);
    }
    const geometry = new THREE.SphereGeometry(0.5, 16, 16);
    const material = new THREE.MeshPhongMaterial({
        color: 0xFF4444,
        emissive: 0xFF0000,
        emissiveIntensity: 0.5,
        shininess: 100
    });
    foodMesh = new THREE.Mesh(geometry, material);
    foodMesh.position.set(
        position.x - config.gridSize / 2,
        0.5,
        position.y - config.gridSize / 2
    );
    foodMesh.castShadow = true;

    // 添加到gameContainer而不是scene
    gameContainer.add(foodMesh);
}

// 修改createSnakeSegment函数
function createSnakeSegment(position) {
    const group = new THREE.Group();

    // 身体主体
    const bodyGeometry = new THREE.SphereGeometry(config.segmentRadius, 32, 32);
    const bodyMaterial = new THREE.MeshPhongMaterial({
        color: 0x4CAF50,
        specular: 0x050505,
        shininess: 100
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    group.add(body);

    // 添加眼睛（只给头部添加）
    if (position === snake[0]) {
        const eyeGeometry = new THREE.SphereGeometry(0.1, 16, 16);
        const eyeMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
        const pupilMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });

        // 左眼
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(0.2, 0.2, 0.3);
        const leftPupil = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), pupilMaterial);
        leftPupil.position.set(0.22, 0.2, 0.35);
        group.add(leftEye);
        group.add(leftPupil);

        // 右眼
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(-0.2, 0.2, 0.3);
        const rightPupil = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), pupilMaterial);
        rightPupil.position.set(-0.22, 0.2, 0.35);
        group.add(rightEye);
        group.add(rightPupil);
    }

    group.position.set(
        position.x - config.gridSize / 2,
        config.segmentRadius,
        position.y - config.gridSize / 2
    );

    gameContainer.add(group);
    return group;
}

// 根据场景旋转调整方向
function getAdjustedDirection(inputDirection) {
    const rotationY = gameContainer.rotation.y;
    const rotationAngle = Math.round((rotationY / (Math.PI / 2)) % 4);
    
    const directionMap = {
        'up': ['up', 'left', 'down', 'right'],
        'right': ['right', 'up', 'left', 'down'],
        'down': ['down', 'right', 'up', 'left'],
        'left': ['left', 'down', 'right', 'up']
    };
    
    return directionMap[inputDirection][rotationAngle < 0 ? (4 + rotationAngle) : rotationAngle];
}

// 渲染场景
function render() {
    TWEEN.update();
    renderer.render(scene, camera);
    requestAnimationFrame(render);
}

// 初始化游戏
function initGame() {
    // 重置场景旋转
    new TWEEN.Tween(gameContainer.rotation)
        .to({ y: 0 }, 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();

    // 重新生成树木装饰
    addDecorations();

    // 初始化蛇
    snake = [];
    snakeSegments.forEach(segment => gameContainer.remove(segment));
    snakeSegments = [];

    for (let i = config.initialSnakeLength - 1; i >= 0; i--) {
        const position = {x: i, y: 0};
        snake.push(position);
        snakeSegments.push(createSnakeSegment(position));
    }
    
    // 生成第一个食物
    generateFood();
    
    // 重置分数和食物计数
    score = 0;
    config.currentFoodCount = 0;
    updateScore();
    
    // 重置方向
    direction = 'right';
    nextDirection = 'right';
}

// 生成食物
function generateFood() {
    while (true) {
        food = {
            x: Math.floor(Math.random() * config.gridSize),
            y: Math.floor(Math.random() * config.gridSize)
        };
        
        // 确保食物不会生成在蛇身上
        let foodOnSnake = false;
        for (let segment of snake) {
            if (segment.x === food.x && segment.y === food.y) {
                foodOnSnake = true;
                break;
            }
        }
        
        if (!foodOnSnake) {
            createFood(food);
            break;
        }
    }
}

// 更新游戏状态
function update() {
    direction = nextDirection;
    
    const head = {...snake[0]};
    switch (direction) {
        case 'up': head.y--; break;
        case 'down': head.y++; break;
        case 'left': head.x--; break;
        case 'right': head.x++; break;
    }
    
    if (isCollision(head)) {
        gameOver();
        return;
    }
    
    // 移除旧的头部眼睛
    if (snakeSegments.length > 0) {
        const oldHead = snakeSegments[0];
        while (oldHead.children.length > 1) {
            oldHead.remove(oldHead.children[oldHead.children.length - 1]);
        }
    }
    
    snake.unshift(head);
    const newSegment = createSnakeSegment(head);
    snakeSegments.unshift(newSegment);
    
    // 检查是否碰到蘑菇
    const hitMushroom = mushrooms.find(m => m.userData.gridX === head.x && m.userData.gridZ === head.y);
    if (hitMushroom) {
        if (hitMushroom.userData.isPoisonous) {
            // 毒蘑菇效果：缩短蛇的长度
            if (snake.length > 2) {
                snake.pop();
                const oldSegment = snakeSegments.pop();
                gameContainer.remove(oldSegment);
            } else {
                snake.pop();
                const oldSegment = snakeSegments.pop();
                gameContainer.remove(oldSegment);
                gameOver();
            }
            // 移除被吃掉的毒蘑菇
            gameContainer.remove(hitMushroom);
            mushrooms = mushrooms.filter(m => m !== hitMushroom);
        } else {
            // 正常蘑菇效果：加20分
            score += 20;
            updateScore();
            // 移除被吃掉的蘑菇
            gameContainer.remove(hitMushroom);
            mushrooms = mushrooms.filter(m => m !== hitMushroom);

            // 添加得分特效
            const scoreText = document.createElement('div');
            scoreText.textContent = '+20';
            scoreText.style.position = 'absolute';
            scoreText.style.color = '#FF4444';
            scoreText.style.fontSize = '24px';
            scoreText.style.fontWeight = 'bold';
            scoreText.style.pointerEvents = 'none';
            document.getElementById('game-container').appendChild(scoreText);

            // 计算得分文本的位置
            const vector = new THREE.Vector3(
                hitMushroom.userData.gridX - config.gridSize / 2,
                1,
                hitMushroom.userData.gridZ - config.gridSize / 2
            );
            vector.project(camera);
            const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;

            scoreText.style.left = `${x}px`;
            scoreText.style.top = `${y}px`;

            // 添加动画效果
            scoreText.style.transition = 'all 1s ease-out';
            scoreText.style.opacity = '1';
            setTimeout(() => {
                scoreText.style.opacity = '0';
                scoreText.style.transform = 'translateY(-50px)';
                setTimeout(() => {
                    document.getElementById('game-container').removeChild(scoreText);
                }, 1000);
            }, 0);
        }
    }

    if (head.x === food.x && head.y === food.y) {
        score += 10;
        updateScore();
        generateFood();

        // 更新食物计数并检查是否需要旋转场景
        config.currentFoodCount++;
        if (config.currentFoodCount >= config.rotationFoodCount) {
            config.currentFoodCount = 0;
            // 随机选择旋转方向（左或右）
            const rotateRight = Math.random() < 0.5;
            const rotationAngle = rotateRight ? Math.PI/2 : -Math.PI/2;

            // 清除所有现有蘑菇
            mushrooms.forEach(mushroom => {
                gameContainer.remove(mushroom);
            });
            mushrooms = [];

            // 使用TWEEN创建旋转动画
            new TWEEN.Tween(gameContainer.rotation)
                .to({ y: gameContainer.rotation.y + rotationAngle }, 1000)
                .easing(TWEEN.Easing.Quadratic.Out)
                .onComplete(() => {
                    // 在旋转完成后，开始逐渐生成新的蘑菇
                    const mushroomCount = Math.floor(Math.random() * 4) + 6;
                    let currentCount = 0;
                    
                    function generateNextMushroom() {
                        if (currentCount < mushroomCount) {
                            const isPoisonous = currentCount < 3 ? true : Math.random() < 0.4;
                            let x, z;
                            let attempts = 0;
                            const maxAttempts = 50;
                            const occupiedPositions = new Set();
                            
                            // 获取所有已占用的位置
                            mushrooms.forEach(m => occupiedPositions.add(`${m.userData.gridX},${m.userData.gridZ}`));
                            trees.forEach(t => occupiedPositions.add(`${t.userData.gridX},${t.userData.gridZ}`));
                            snake.forEach(s => occupiedPositions.add(`${s.x},${s.y}`));
                            
                            do {
                                x = Math.floor(Math.random() * (config.gridSize - 4)) + 2;
                                z = Math.floor(Math.random() * (config.gridSize - 4)) + 2;
                                attempts++;
                                
                                if (attempts > maxAttempts) return;
                                
                            } while (
                                occupiedPositions.has(`${x},${z}`) ||
                                Array.from(occupiedPositions).some(pos => {
                                    const [ox, oz] = pos.split(',').map(Number);
                                    return Math.abs(ox - x) < 2 && Math.abs(oz - z) < 2;
                                })
                            );
                            
                            if (attempts <= maxAttempts) {
                                const mushroomGroup = new THREE.Group();
                                
                                // 蘑菇柄
                                const stemGeometry = new THREE.CylinderGeometry(0.15, 0.2, 0.6, 8);
                                const stemMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
                                const stem = new THREE.Mesh(stemGeometry, stemMaterial);
                                stem.castShadow = true;
                                mushroomGroup.add(stem);
                                
                                // 蘑菇帽
                                const capGeometry = new THREE.SphereGeometry(0.5, 16, 16);
                                capGeometry.scale(1, 0.5, 1);
                                const capMaterial = new THREE.MeshPhongMaterial({
                                    color: isPoisonous ? 0x800080 : 0xFF0000,
                                    emissive: isPoisonous ? 0x400040 : 0x330000,
                                    emissiveIntensity: 0.2
                                });
                                const cap = new THREE.Mesh(capGeometry, capMaterial);
                                cap.position.y = 0.4;
                                cap.castShadow = true;
                                
                                // 添加白色斑点
                                const spotGeometry = new THREE.CircleGeometry(0.08, 8);
                                const spotMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
                                for (let j = 0; j < 5; j++) {
                                    const spot = new THREE.Mesh(spotGeometry, spotMaterial);
                                    spot.rotation.x = -Math.PI / 2;
                                    spot.position.y = 0.41;
                                    spot.position.x = Math.cos(j * Math.PI * 0.4) * 0.25;
                                    spot.position.z = Math.sin(j * Math.PI * 0.4) * 0.25;
                                    cap.add(spot);
                                }
                                
                                mushroomGroup.add(cap);
                                
                                // 设置蘑菇位置
                                mushroomGroup.position.set(
                                    x - config.gridSize / 2,
                                    0,
                                    z - config.gridSize / 2
                                );
                                
                                // 添加碰撞检测所需的属性
                                mushroomGroup.userData = { gridX: x, gridZ: z, isPoisonous: isPoisonous };
                                
                                // 从地下升起的动画效果
                                mushroomGroup.scale.set(1, 0, 1);
                                gameContainer.add(mushroomGroup);
                                mushrooms.push(mushroomGroup);
                                
                                new TWEEN.Tween(mushroomGroup.scale)
                                    .to({ y: 1 }, 500)
                                    .easing(TWEEN.Easing.Back.Out)
                                    .start();
                                
                                currentCount++;
                                // 延迟生成下一个蘑菇
                                setTimeout(generateNextMushroom, 300);
                            }
                        }
                    }
                    
                    // 开始生成第一个蘑菇
                    generateNextMushroom();
                    
                    // 在旋转完成后，更新实际的移动方向
                    direction = getAdjustedDirection(nextDirection);
                })
                .start();
        }

        // 添加得分特效
        const scoreText = document.createElement('div');
        scoreText.textContent = '+10';
        scoreText.style.color = '#4CAF50';
        scoreText.style.position = 'absolute';
        scoreText.style.color = '#4CAF50';
        scoreText.style.fontSize = '24px';
        scoreText.style.fontWeight = 'bold';
        scoreText.style.pointerEvents = 'none';
        document.getElementById('game-container').appendChild(scoreText);

        // 计算得分文本的位置
        const vector = new THREE.Vector3(
            food.x - config.gridSize / 2,
            1,
            food.y - config.gridSize / 2
        );
        vector.project(camera);
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;

        scoreText.style.left = `${x}px`;
        scoreText.style.top = `${y}px`;

        // 添加动画效果
        scoreText.style.transition = 'all 1s ease-out';
        scoreText.style.opacity = '1';
        setTimeout(() => {
            scoreText.style.opacity = '0';
            scoreText.style.transform = 'translateY(-50px)';
            setTimeout(() => {
                document.getElementById('game-container').removeChild(scoreText);
            }, 1000);
        }, 0);
    } else {
        snake.pop();
        const oldSegment = snakeSegments.pop();
        gameContainer.remove(oldSegment);
    }
}

// 根据场景旋转调整方向
function getAdjustedDirection(inputDirection) {
    const rotationY = gameContainer.rotation.y;
    const rotationAngle = Math.round((rotationY / (Math.PI / 2)) % 4);
    
    const directionMap = {
        'up': ['up', 'left', 'down', 'right'],
        'right': ['right', 'up', 'left', 'down'],
        'down': ['down', 'right', 'up', 'left'],
        'left': ['left', 'down', 'right', 'up']
    };
    
    return directionMap[inputDirection][rotationAngle < 0 ? (4 + rotationAngle) : rotationAngle];
}

// 渲染场景
function render() {
    TWEEN.update();
    renderer.render(scene, camera);
    requestAnimationFrame(render);
}

// 检查碰撞
function isCollision(head) {
    // 检查墙壁碰撞
    if (head.x < 0 || head.x >= config.gridSize || head.y < 0 || head.y >= config.gridSize) {
        return true;
    }
    
    // 检查自身碰撞
    for (let segment of snake) {
        if (head.x === segment.x && head.y === segment.y) {
            return true;
        }
    }
    
    // 检查树木碰撞
    for (let tree of trees) {
        if (head.x === tree.userData.gridX && head.y === tree.userData.gridZ) {
            return true;
        }
    }
    
    return false;
}

// 根据场景旋转调整方向
function getAdjustedDirection(inputDirection) {
    const rotationY = gameContainer.rotation.y;
    const rotationAngle = Math.round((rotationY / (Math.PI / 2)) % 4);
    
    const directionMap = {
        'up': ['up', 'left', 'down', 'right'],
        'right': ['right', 'up', 'left', 'down'],
        'down': ['down', 'right', 'up', 'left'],
        'left': ['left', 'down', 'right', 'up']
    };
    
    return directionMap[inputDirection][rotationAngle < 0 ? (4 + rotationAngle) : rotationAngle];
}

// 渲染场景
function render() {
    TWEEN.update();
    renderer.render(scene, camera);
    requestAnimationFrame(render);
}

// 游戏主循环
function runGameLoop() {
    update();
}

// 开始游戏
function startGame() {
    // 隐藏欢迎弹框
    document.getElementById('welcome').style.display = 'none';

    // 重置游戏状态
    initGame();
    
    // 隐藏游戏结束界面
    document.getElementById('game-over').style.display = 'none';
    
    // 清除之前的游戏循环
    if (gameLoop) clearInterval(gameLoop);
    
    // 开始新的游戏循环
    gameLoop = setInterval(runGameLoop, config.gameSpeed);
}

// 初始化游戏并开始
document.addEventListener('DOMContentLoaded', () => {
    initThreeJS();
    render();
});

// 游戏结束
function gameOver() {
    clearInterval(gameLoop);
    const gameOverDialog = document.getElementById('game-over');
    gameOverDialog.style.display = 'block';
    // 使用setTimeout确保display生效后再添加active类，以触发过渡动画
    setTimeout(() => {
        gameOverDialog.classList.add('active');
    }, 10);
    document.getElementById('final-score').textContent = score;
    // 模拟排名计算，将来会替换为真实的全球排名
    const simulatedRank = Math.max(1, Math.floor(1000 / (score + 1)));
    document.getElementById('final-rank').textContent = `#${simulatedRank}`;
}

// 更新分数显示
function updateScore() {
    document.getElementById('score').textContent = `${getText('score')}${score}`;
}

// 根据场景旋转获取实际方向
function getAdjustedDirection(inputDirection) {
    // 获取当前场景旋转角度（标准化到0-2π）
    let rotation = (gameContainer.rotation.y % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    // 将弧度转换为90度的倍数
    let quarterTurns = Math.round(rotation / (Math.PI / 2));
    quarterTurns = (quarterTurns + 4) % 4; // 确保是0-3之间的值

    // 方向映射表
    const directionMap = {
        0: { 'up': 'up', 'down': 'down', 'left': 'left', 'right': 'right' },
        1: { 'up': 'right', 'down': 'left', 'left': 'up', 'right': 'down' },
        2: { 'up': 'down', 'down': 'up', 'left': 'right', 'right': 'left' },
        3: { 'up': 'left', 'down': 'right', 'left': 'down', 'right': 'up' }
    };

    return directionMap[quarterTurns][inputDirection];
}

// 键盘控制
document.addEventListener('keydown', (event) => {
    let inputDirection = '';
    switch (event.key.toLowerCase()) {
        case 'arrowup':
        case 'w': inputDirection = 'up'; break;
        case 'arrowdown':
        case 's': inputDirection = 'down'; break;
        case 'arrowleft':
        case 'a': inputDirection = 'left'; break;
        case 'arrowright':
        case 'd': inputDirection = 'right'; break;
        default: return;
    }

    const adjustedDirection = getAdjustedDirection(inputDirection);
    const oppositeDirections = {
        'up': 'down',
        'down': 'up',
        'left': 'right',
        'right': 'left'
    };

    if (direction !== oppositeDirections[adjustedDirection]) {
        nextDirection = adjustedDirection;
    }
});

// 获取相反方向的辅助函数
function getOppositeDirection(dir) {
    switch (dir) {
        case 'up': return 'down';
        case 'down': return 'up';
        case 'left': return 'right';
        case 'right': return 'left';
        default: return dir;
    }
}

// 新增：模拟按下 WASD 键的函数
function simulateKeyPress(key) {
    let inputDirection = '';
    switch (key.toLowerCase()) {
        case 'arrowup':
        case 'w': inputDirection = 'up'; break;
        case 'arrowdown':
        case 's': inputDirection = 'down'; break;
        case 'arrowleft':
        case 'a': inputDirection = 'left'; break;
        case 'arrowright':
        case 'd': inputDirection = 'right'; break;
        default: return;
    }

    const adjustedDirection = getAdjustedDirection(inputDirection);
    const oppositeDirections = {
        'up': 'down',
        'down': 'up',
        'left': 'right',
        'right': 'left'
    };

    if (direction !== oppositeDirections[adjustedDirection]) {
        nextDirection = adjustedDirection;
    }
    document.dispatchEvent(event);
}

// 在文件的适当位置添加以下代码
document.getElementById('up').addEventListener('click', () => {
    simulateKeyPress('w');
});

document.getElementById('down').addEventListener('click', () => {
    simulateKeyPress('s');
});

document.getElementById('left').addEventListener('click', () => {
    simulateKeyPress('a');
});

document.getElementById('right').addEventListener('click', () => {
    simulateKeyPress('d');
});