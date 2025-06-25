import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { gsap } from 'gsap';

let scene, camera, renderer, hourHand, minuteHand, clockGroup;
let angleStep = Math.PI / 6;
let currentStep = 0;
let sectors = [];
const colors = ['#FFB6C1', '#FFD700', '#90EE90', '#87CEFA', '#FFA07A', '#DDA0DD', '#F08080', '#B0E0E6', '#FFFACD', '#E0FFFF', '#E6E6FA', '#FFE4E1'];
let leftPupil, rightPupil;
let video, videoTexture;

init();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#FFF176');

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 50);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  new OrbitControls(camera, renderer.domElement);

  // Lighting
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(10, 10, 10);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));

  // Clock Group
  clockGroup = new THREE.Group();
  scene.add(clockGroup);

  // Clock Body
  const innerCircle = new THREE.Mesh(
    new THREE.CylinderGeometry(18, 18, 1, 64),
    new THREE.MeshStandardMaterial({ color: '#ffffff' })
  );
  innerCircle.rotation.x = Math.PI / 2;
  clockGroup.add(innerCircle);

  const outerRing = new THREE.Mesh(
    new THREE.RingGeometry(18.5, 20, 64),
    new THREE.MeshStandardMaterial({ color: '#DDAA88' })
  );
  outerRing.rotation.x = Math.PI / 2;
  outerRing.position.z = 0.51;
  clockGroup.add(outerRing);

  // ⏱️ Tick Marks (12 hour marks)
  for (let i = 0; i < 12; i++) {
    const angle = i * angleStep - Math.PI / 2;
    const innerR = 14.5;
    const outerR = 17.5;

    const x1 = innerR * Math.cos(angle);
    const y1 = innerR * Math.sin(angle);
    const x2 = outerR * Math.cos(angle);
    const y2 = outerR * Math.sin(angle);

    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x1, y1, 0.61),
      new THREE.Vector3(x2, y2, 0.61)
    ]);

    const material = new THREE.LineBasicMaterial({ color: '#333333' });
    const line = new THREE.Line(geometry, material);
    clockGroup.add(line);
  }

  // ⏱️ Minute Tick Marks (60 total)
  for (let i = 0; i < 60; i++) {
    // Skip the ones where big hour marks already exist
    if (i % 5 === 0) continue;

    const angle = i * (Math.PI * 2 / 60) - Math.PI / 2;
    const innerR = 16.2;
    const outerR = 17.5;

    const x1 = innerR * Math.cos(angle);
    const y1 = innerR * Math.sin(angle);
    const x2 = outerR * Math.cos(angle);
    const y2 = outerR * Math.sin(angle);

    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x1, y1, 0.61),
      new THREE.Vector3(x2, y2, 0.61)
    ]);

    const material = new THREE.LineBasicMaterial({ color: '#444444' });
    const line = new THREE.Line(geometry, material);
    clockGroup.add(line);
  }
  // Center Sphere
  const centerSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 32, 32),
    new THREE.MeshStandardMaterial({ color: '#000000' })
  );
  centerSphere.position.z = 1.1;
  clockGroup.add(centerSphere);

  // Clock Numbers
  const loader = new FontLoader();
  loader.load('/fonts/helvetiker_regular.typeface.json', function (font) {
    for (let i = 1; i <= 12; i++) {
      const textGeo = new TextGeometry(i.toString(), {
        font,
        size: 1,
        height: 0.2
      });
      textGeo.center();
      const material = new THREE.MeshStandardMaterial({ color: '#228B22' });
      const textMesh = new THREE.Mesh(textGeo, material);

      const angle = ((12 - i) * angleStep) + Math.PI / 2;
      const radius = 13;

      textMesh.position.x = radius * Math.cos(angle);
      textMesh.position.y = radius * Math.sin(angle);
      textMesh.position.z = 0.6;

      clockGroup.add(textMesh);
    }
  });

  // Clock Hands
  const hourGeometry = new THREE.BoxGeometry(1, 7, 0.2);
  hourGeometry.translate(0, 3.5, 0);
  const hourMaterial = new THREE.MeshStandardMaterial({ color: '#FFA500' });
  hourHand = new THREE.Mesh(hourGeometry, hourMaterial);
  hourHand.position.set(0, 0, 0.8);
  clockGroup.add(hourHand);

  const minuteGeometry = new THREE.BoxGeometry(0.7, 12, 0.2);
  minuteGeometry.translate(0, 6, 0);
  const minuteMaterial = new THREE.MeshStandardMaterial({ color: '#FFD700' });
  minuteHand = new THREE.Mesh(minuteGeometry, minuteMaterial);
  minuteHand.position.set(0, 0, 1);
  clockGroup.add(minuteHand);

  loadVideo();

  createSector(currentStep);
  createEyes();
  createMoustache();
  createMouth();
  animate();
  setInterval(updateClock, 2000);
}

function loadVideo(callback) {
  video = document.createElement('video');
  video.src = '/videos/video1698426668.mp4';
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = 'anonymous'; // Add this if needed

  video.addEventListener('canplay', () => {
    console.log('✅ Video is ready to play');

    videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBAFormat;

    if (callback) callback();
  });

  video.addEventListener('error', (e) => {
    console.error('❌ Video load error', e);
  });

  // Require user interaction to start video
  document.addEventListener('click', () => {
    video.play().then(() => {
      console.log('🎬 Video started playing');
    }).catch(err => {
      console.error('⚠️ Video play failed', err);
    });
  });
}




function createSector(step) {
  const shape = new THREE.Shape();
  const radius = 20;
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + angleStep * (step + 1);

  shape.moveTo(0, 0);
  shape.absarc(0, 0, radius, startAngle + angleStep * step, endAngle, false);

  const geometry = new THREE.ShapeGeometry(shape);
  const material = new THREE.MeshStandardMaterial({
    color: colors[step % colors.length],
    opacity: 0.5,
    transparent: true,
    side: THREE.DoubleSide
  });

  const sector = new THREE.Mesh(geometry, material);
  sector.rotation.x = Math.PI / 2;
  sector.position.z = 0.5;
  clockGroup.add(sector);

  // Remove previous sector if you want only one
  if (sectors.length > 0) {
    clockGroup.remove(sectors[0]);
    sectors.shift();
  }
  sectors.push(sector);
}

function createVideoSector(startStep, endStep) {
  const shape = new THREE.Shape();
  const radius = 20;
  const startAngle = -Math.PI / 2 + angleStep * startStep;
  const endAngle = -Math.PI / 2 + angleStep * endStep;

  shape.moveTo(0, 0);
  shape.absarc(0, 0, radius, startAngle, endAngle, false);

  const geometry = new THREE.ShapeGeometry(shape);

  // ⬇️ Load Test Image Texture
  const textureLoader = new THREE.TextureLoader();
  const testTexture = textureLoader.load('/images/accident1.jpg');

  const material = new THREE.MeshBasicMaterial({ map: testTexture, side: THREE.DoubleSide });

  const videoSector = new THREE.Mesh(geometry, material);
  videoSector.rotation.x = Math.PI / 2;
  videoSector.position.z = -1.5; // Move it fully behind the clock

  clockGroup.add(videoSector);
}


function createEyes() {
  const eyeWhiteMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff' });
  const pupilMaterial = new THREE.MeshStandardMaterial({ color: '#000000' });

  const eyeRadius = 1.5;
  const pupilRadius = 0.7;

  const eyeYOffset = 7.5;
  const eyeXOffset = 4.5;
  const eyeZOffset = 2.5;

  for (let side of [-1, 1]) {
    // White sphere (eye)
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(eyeRadius, 32, 32),
      eyeWhiteMaterial
    );
    eye.position.set(side * eyeXOffset, eyeYOffset, eyeZOffset);
    clockGroup.add(eye);

    // Black sphere (pupil) — forward shifted!
    const pupil = new THREE.Mesh(
      new THREE.SphereGeometry(pupilRadius, 32, 32),
      pupilMaterial
    );

    // Slightly in front of the white sphere
    pupil.position.set(side * eyeXOffset, eyeYOffset, eyeZOffset + 1.05);
    clockGroup.add(pupil);

    if (side === -1) leftPupil = pupil;
    else rightPupil = pupil;
  }
}

function createMoustache() {
  const moustacheShape = new THREE.Shape();

  // Smooth, curvy moustache shape
  moustacheShape.moveTo(-3.5, 0);
  moustacheShape.quadraticCurveTo(-3.2, 1.2, -2.2, 0.6);
  moustacheShape.quadraticCurveTo(-1.2, -0.2, 0, 0.0);
  moustacheShape.quadraticCurveTo(1.2, -0.2, 2.2, 0.6);
  moustacheShape.quadraticCurveTo(3.2, 1.2, 3.5, 0);

  // Bottom edge
  moustacheShape.lineTo(3.2, -0.5);
  moustacheShape.quadraticCurveTo(2, -0.3, 1.2, -0.6);
  moustacheShape.quadraticCurveTo(0, -1.0, -1.2, -0.6);
  moustacheShape.quadraticCurveTo(-2, -0.3, -3.2, -0.5);
  moustacheShape.lineTo(-3.5, 0);

  const moustacheSettings = {
    depth: 0.5,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 2
  };

  const moustacheGeo = new THREE.ExtrudeGeometry(moustacheShape, moustacheSettings);
  const moustacheMat = new THREE.MeshStandardMaterial({ color: '#000000' });
  const moustacheMesh = new THREE.Mesh(moustacheGeo, moustacheMat);

  moustacheMesh.rotation.set(Math.PI / 4, 0, 0);  // Less tilt
  moustacheMesh.position.set(0, -3.2, 2.5);          // Bring slightly forward
  moustacheMesh.scale.set(0.7, 0.7, 1.2);            // Slightly wider and deeper

  clockGroup.add(moustacheMesh);
}

function createMouth() {
  const mouthShape = new THREE.Shape();

  // Smiling arc
  mouthShape.moveTo(-2, 0);
  mouthShape.quadraticCurveTo(0, 1, 2, 0);
  mouthShape.lineTo(1.8, -0.3);
  mouthShape.quadraticCurveTo(0, -0.5, -1.8, -0.3);
  mouthShape.lineTo(-2, 0);

  const mouthSettings = {
    depth: 0.3,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 1
  };

  const mouthGeometry = new THREE.ExtrudeGeometry(mouthShape, mouthSettings);
  const mouthMaterial = new THREE.MeshStandardMaterial({ color: '#000000' });
  const mouthMesh = new THREE.Mesh(mouthGeometry, mouthMaterial);

  mouthMesh.rotation.set(-Math.PI / 2, 0, 0);      // face forward
  mouthMesh.position.set(0, -5.4, 2.5);  // Bring forward slightly  
  mouthMesh.scale.set(0.9, 0.9, 1);      // Make a bit wider

  const oldMouth = clockGroup.getObjectByName('mouth');
  if (oldMouth) clockGroup.remove(oldMouth);

  mouthMesh.name = 'mouth';
  clockGroup.add(mouthMesh);
}

function createImageOnBack() {
  const textureLoader = new THREE.TextureLoader();
  const testTexture = textureLoader.load('/images/accident1.jpeg', (texture) => {
    const imageAspect = texture.image.width / texture.image.height;

    // Default: repeat full texture
    texture.repeat.set(1, 1);
    texture.offset.set(0, 0);

    // Crop and center to make it a square region
    if (imageAspect > 1) {
      // Wide image
      texture.repeat.set(1 / imageAspect, 1);
      texture.offset.x = (1 - (1 / imageAspect)) / 2;
    } else {
      // Tall image
      texture.repeat.set(1, imageAspect);
      texture.offset.set(0, (1 - imageAspect) / 2);
    }

    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
  });

  console.log(testTexture,'sssssssssssss');
  
  // ✅ Circle geometry
  const geometry = new THREE.CircleGeometry(18, 64);
  const material = new THREE.MeshBasicMaterial({ map: testTexture, side: THREE.DoubleSide });

  const imageCircle = new THREE.Mesh(geometry, material);

  // ✅ Correct facing and flipping
  imageCircle.rotation.x = -Math.PI ;  // Flat against the clock back
  imageCircle.rotation.z = Math.PI;       // Flips the image to face the right direction when clock is spun

  imageCircle.position.z = -0.51;         // Just behind the clock

  clockGroup.add(imageCircle);
}

function createVideoOnBack() {
  if (!videoTexture) {
    loadVideo(() => {
      // Once video is ready, create the mesh
      createVideoMesh();
    });
  } else {
    createVideoMesh();
  }
}

function createVideoMesh() {
  // Make sure the texture wraps correctly
  videoTexture.wrapS = THREE.ClampToEdgeWrapping;
  videoTexture.wrapT = THREE.ClampToEdgeWrapping;

  const geometry = new THREE.CircleGeometry(18, 64);
  const material = new THREE.MeshBasicMaterial({ map: videoTexture, side: THREE.DoubleSide });

  const videoCircle = new THREE.Mesh(geometry, material);

  // Flip to properly face the user when the clock is spun
  videoCircle.rotation.x = -Math.PI;
  videoCircle.rotation.z = Math.PI;

  videoCircle.position.z = -0.51;

  clockGroup.add(videoCircle);

  // 👉 Always reset and play from start
  video.currentTime = 0;
  video.play();

  // 👉 Listen for video end
  video.onended = () => {
    console.log('Video finished, rotating back...');

    gsap.to(clockGroup.rotation, { 
      y: "+=" + (Math.PI * 9),  // 4.5 turns back
      duration: 2, 
      ease: "power2.inOut"
    });
  };
}


function updateClock() {
  const previousStep = currentStep;
  currentStep = (currentStep + 1) % 12;

  if (previousStep === 11 && currentStep === 0) {
    // createImageOnBack();
    createVideoOnBack();

    gsap.to(clockGroup.rotation, { 
      y: "+=" + (Math.PI * 9),  // 4.5 turns
      duration: 2, 
      ease: "power2.inOut"
    });

    return;
  }

  const rotation = currentStep * angleStep;
  minuteHand.rotation.z = -rotation;

  createSector(currentStep);
}


function animate() {
  requestAnimationFrame(animate);
  if (videoTexture) {
    videoTexture.needsUpdate = true; // Force texture refresh
  }
  renderer.render(scene, camera);
}

document.addEventListener('mousemove', onMouseMove);

function onMouseMove(event) {
  // Normalize mouse position between -1 and 1
  const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
  const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

  const maxOffset = 0.4;

  if (leftPupil && rightPupil) {
    leftPupil.position.x = -4.5 + mouseX * maxOffset;
    leftPupil.position.y = 7.5 + mouseY * maxOffset;

    rightPupil.position.x = 4.5 + mouseX * maxOffset;
    rightPupil.position.y = 7.5 + mouseY * maxOffset;
  }
}


video.addEventListener('canplay', () => {
  console.log('Video can play');
});
video.addEventListener('error', (e) => {
  console.error('Video error', e);
});