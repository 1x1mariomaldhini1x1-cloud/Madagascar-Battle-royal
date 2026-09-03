setTimeout(() => {
    document.getElementById('ui-menu').style.display = 'block';
}, 3500);

let scene, camera, renderer;
let playerHP = 100;
let enemies = [];
let difficultySetting = 'facile';

let plane, parachute;
let isParachuting = false;
let isGrounded = false;
let fallSpeed = 0.3;

const weapons = {
    'MP40': { damage: 18, rate: 100, pitch: 800 },
    'UMP': { damage: 24, rate: 140, pitch: 650 },
    'M1887': { damage: 90, rate: 800, pitch: 200 },
    'SKS': { damage: 55, rate: 350, pitch: 400 },
    'WOODPECKER': { damage: 65, rate: 400, pitch: 300 }
};

let currentGun = 'MP40';
let lastShotTime = 0;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playGunSound(pitch) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(pitch, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
}

function switchGun(gunName) {
    if (weapons[gunName]) {
        currentGun = gunName;
        document.getElementById('current-gun').innerText = gunName;
    }
}

function startGame(level) {
    difficultySetting = level;
    document.getElementById('ui-menu').style.display = 'none';
    document.getElementById('game-ui').style.display = 'block';
    
    init3D();
    createMadagascarMap();
    spawnPlaneAndParachute();
    spawnBots();
    
    window.addEventListener('click', onPlayerAction);
    animate();
}

function init3D() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 50, 0);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(10, 50, 10);
    scene.add(light);
}

function createMadagascarMap() {
    const geometry = new THREE.PlaneGeometry(300, 300);
    const material = new THREE.MeshBasicMaterial({ color: 0x2e8b57, side: THREE.DoubleSide });
    const planeTerrain = new THREE.Mesh(geometry, material);
    planeTerrain.rotation.x = Math.PI / 2;
    scene.add(planeTerrain);
}

function spawnPlaneAndParachute() {
    const planeGeo = new THREE.BoxGeometry(6, 2, 12);
    const planeMat = new THREE.MeshBasicMaterial({ color: 0x7f8c8d });
    plane = new THREE.Mesh(planeGeo, planeMat);
    plane.position.set(0, 52, 0);
    scene.add(plane);

    const paraGeo = new THREE.ConeGeometry(3, 2, 8);
    const paraMat = new THREE.MeshBasicMaterial({ color: 0xe74c3c });
    parachute = new THREE.Mesh(paraGeo, paraMat);
    parachute.position.set(0, 53, 0);
    parachute.visible = false;
    scene.add(parachute);
}

function spawnBots() {
    let speed = 0.03;
    if (difficultySetting === 'moyen') speed = 0.07;
    if (difficultySetting === 'difficile') speed = 0.12;

    for (let i = 0; i < 5; i++) {
        const botGeo = new THREE.BoxGeometry(1.5, 3, 1.5);
        const botMat = new THREE.MeshBasicMaterial({ color: 0xc0392b });
        const bot = new THREE.Mesh(botGeo, botMat);
        
        bot.position.set((Math.random() - 0.5) * 150, 1.5, (Math.random() - 0.5) * 150);
        bot.userData = { speed: speed, hp: 120 };
        
        scene.add(bot);
        enemies.push(bot);
    }
}

function onPlayerAction(e) {
    if (e.target.tagName === 'BUTTON') return;

    if (!isParachuting && !isGrounded) {
        isParachuting = true;
        parachute.visible = true;
        return;
    }

    if (isGrounded) {
        const now = Date.now();
        const gun = weapons[currentGun];

        if (now - lastShotTime < gun.rate) return;
        lastShotTime = now;

        playGunSound(gun.pitch);

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        
        const intersects = raycaster.intersectObjects(enemies);
        if (intersects.length > 0) {
            const hitBot = intersects[0].object;
            hitBot.userData.hp -= gun.damage;

            if (hitBot.userData.hp <= 0) {
                scene.remove(hitBot);
                enemies = enemies.filter(e => e !== hitBot);
                document.getElementById('enemies').innerText = enemies.length;
            }
        }
    }
}

function animate() {
    requestAnimationFrame(animate);

    if (!isGrounded && !isParachuting) {
        plane.position.z -= 0.2;
        camera.position.z = plane.position.z;
    }

    if (isParachuting && !isGrounded) {
        camera.position.y -= fallSpeed;
        parachute.position.set(camera.position.x, camera.position.y + 3, camera.position.z);

        if (camera.position.y <= 2) {
            camera.position.y = 2;
            isParachuting = false;
            isGrounded = true;
            parachute.visible = false;
        }
    }

    if (isGrounded) {
        enemies.forEach(bot => {
            bot.lookAt(camera.position);
            bot.translateZ(bot.userData.speed);

            const dist = bot.position.distanceTo(camera.position);
            if (dist < 2) {
                playerHP -= 0.2;
                document.getElementById('hp').innerText = Math.max(0, Math.floor(playerHP));
                if (playerHP <= 0) {
                    alert("MATY IANAO! Voalalaon'ny Deba.");
                    window.location.reload();
                }
            }
        });
    }

    renderer.render(scene, camera);
}