import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { gsap } from 'gsap';

const labels = [
    'Start', 'Plan', 'Design', 'Develop', 'Test', 'Review', 'Deploy',
    'Monitor', 'Improve', 'Scale', 'Support', 'Celebrate', 'Reflect',
    'Innovate', 'Document', 'Communicate', 'Train', 'Optimize',
    'Collaborate', 'Launch', 'Evolve'
];

let totalSteps = labels.length;
let angleStep = (Math.PI * 2) / totalSteps; // full circle divided by 21

let scene, camera, renderer, hourHand, minuteHand, clockGroup;
let currentStep = 0;
let sectors = [];
const colors = ['#FFB6C1', '#FFD700', '#90EE90', '#87CEFA', '#FFA07A', '#DDA0DD', '#F08080', '#B0E0E6', '#FFFACD', '#E0FFFF', '#E6E6FA', '#FFE4E1'];
let leftPupil, rightPupil;
let video, videoTexture;
let isVideoPlaying = false;

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
  for (let i = 0; i < totalSteps; i++) {
    const angle = ((totalSteps - i) * angleStep) + Math.PI / 2;
    const innerR = 16;
    const outerR = 17;

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
  const minorTicksPerSection = 5; // Can also use 6
  const totalMinorTicks = totalSteps * minorTicksPerSection;

  for (let i = 0; i < totalMinorTicks; i++) {
      if (i % minorTicksPerSection === 0) continue; // Skip major ticks

      const angle = i * (Math.PI * 2 / totalMinorTicks) - Math.PI / 2;
      const innerR = 16.5; // Even closer to outer edge
      const outerR = 17;   // Shorter length

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
    for (let i = 1; i <= totalSteps; i++) {
      const label = labels[i - 1];

      const textGeo = new TextGeometry(label, {
        font,
        size: 0.9,
        height: 0.2
      });
      textGeo.center();

      const material = new THREE.MeshStandardMaterial({ color: '#228B22' });
      const textMesh = new THREE.Mesh(textGeo, material);

      const angle = ((totalSteps - i) * angleStep) + Math.PI / 2;
      const radius = 14.1;

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
  showIntroSequence();
  animate();
  setInterval(updateClock, 1000);
}


function showIntroSequence() {
    const messages = [
        "Do you know who I am?",
        "I am Viraj",
        "And do you know what this is?",
        "This is my memory clock",
        "It helps me remember beautiful moments with you",
        "Let's see where it takes!"
    ];

    showSpeechBubblesInSequence(messages, 0, () => {
        // ✅ After bubbles, start the clock
        startClock();
    });
}

function showSpeechBubblesInSequence(messages, index, onComplete) {
    if (index >= messages.length) {
        if (onComplete) onComplete();
        return;
    }

    const bubbleGroup = createSpeechBubble(messages[index], 20, 12, 4, false, 0);

    gsap.to(bubbleGroup.scale, {
        x: 1, y: 1, z: 1,
        duration: 0.7,
        ease: "back.out(1.7)",
        onComplete: () => {
            setTimeout(() => {
                gsap.to(bubbleGroup.scale, {
                    x: 0, y: 0, z: 0,
                    duration: 0.5,
                    ease: "power1.in",
                    onComplete: () => {
                        clockGroup.remove(bubbleGroup);
                        showSpeechBubblesInSequence(messages, index + 1, onComplete);
                    }
                });
            }, 2500);
        }
    });
}
function createSpeechBubble(message, x = 10, y = 5, z = 4, autoHide = true, delay = 1000) {
    const bubbleGroup = new THREE.Group();
    bubbleGroup.position.set(x, y, z);
    bubbleGroup.name = 'speechBubble';
    clockGroup.add(bubbleGroup);

    const loader = new FontLoader();
    loader.load('/fonts/helvetiker_regular.typeface.json', function (font) {
        const textGeo = new TextGeometry(message, {
            font: font,
            size: 1.0,
            height: 0.05,
            curveSegments: 12
        });
        textGeo.computeBoundingBox();

        const textWidth = textGeo.boundingBox.max.x - textGeo.boundingBox.min.x;

        const padding = 2; // Bubble padding
        const bubbleWidth = textWidth + padding * 2;
        const bubbleHeight = 5;
        const radius = 1;

        // Draw bubble shape based on text width
        const shape = new THREE.Shape();
        shape.moveTo(-bubbleWidth / 2 + radius, bubbleHeight / 2);
        shape.lineTo(bubbleWidth / 2 - radius, bubbleHeight / 2);
        shape.quadraticCurveTo(bubbleWidth / 2, bubbleHeight / 2, bubbleWidth / 2, bubbleHeight / 2 - radius);
        shape.lineTo(bubbleWidth / 2, -bubbleHeight / 2 + radius);
        shape.quadraticCurveTo(bubbleWidth / 2, -bubbleHeight / 2, bubbleWidth / 2 - radius, -bubbleHeight / 2);
        shape.lineTo(-bubbleWidth / 2 + radius, -bubbleHeight / 2);
        shape.quadraticCurveTo(-bubbleWidth / 2, -bubbleHeight / 2, -bubbleWidth / 2, -bubbleHeight / 2 + radius);
        shape.lineTo(-bubbleWidth / 2, bubbleHeight / 2 - radius);
        shape.quadraticCurveTo(-bubbleWidth / 2, bubbleHeight / 2, -bubbleWidth / 2 + radius, bubbleHeight / 2);

        const bubbleSettings = {
            depth: 0.7,
            bevelEnabled: true,
            bevelThickness: 0.05,
            bevelSize: 0.05,
            bevelSegments: 5
        };

        const bubbleGeometry = new THREE.ExtrudeGeometry(shape, bubbleSettings);
        const bubbleMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff' });
        const bubbleMesh = new THREE.Mesh(bubbleGeometry, bubbleMaterial);
        bubbleMesh.castShadow = true;

        bubbleGroup.add(bubbleMesh);

        // Tail
        const tailShape = new THREE.Shape();
        tailShape.moveTo(0, 0);
        tailShape.lineTo(1.2, -1.2);
        tailShape.lineTo(2.4, 0);
        tailShape.lineTo(0, 0);

        const tailGeometry = new THREE.ExtrudeGeometry(tailShape, { depth: 0.6, bevelEnabled: false });
        const tailMesh = new THREE.Mesh(tailGeometry, bubbleMaterial);

        tailMesh.position.set(bubbleWidth / 4, -bubbleHeight / 2 - 0.2, 0);
        bubbleGroup.add(tailMesh);

        // Text
        textGeo.center();
        const textMaterial = new THREE.MeshStandardMaterial({ color: '#000000' });
        const textMesh = new THREE.Mesh(textGeo, textMaterial);
        textMesh.position.set(0, 0, 0.8); // Slightly in front of bubble
        bubbleGroup.add(textMesh);
    });

    bubbleGroup.scale.set(0, 0, 0);
    return bubbleGroup;
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

function createEyelashes(x, y, z) {
    const eyelashMaterial = new THREE.LineBasicMaterial({ color: '#000000' });
    const eyelashGroup = new THREE.Group();

    for (let i = -0.5; i <= 0.5; i += 0.2) {
        const points = [
            new THREE.Vector3(x + i, y + 1.3, z + 2.7), // Closer to the eye
            new THREE.Vector3(x + i + (i * 0.1), y + 1.6, z + 2.7) // Tilt outwards
        ];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, eyelashMaterial);
        eyelashGroup.add(line);
    }

    clockGroup.add(eyelashGroup);
}

createEyelashes(-4.5, 7.5, 0); // Left eye
createEyelashes(4.5, 7.5, 0);  // Right eye

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

    // Create a wide, smooth smiling arc
    mouthShape.moveTo(-3, 0); // Start from the left corner
    mouthShape.quadraticCurveTo(0, 0.9, 3, 0); // Smooth upper arc

    // Smooth bottom arc (no sharp edges)
    mouthShape.quadraticCurveTo(0, -1.5, -3, 0); // Smoothly back to start

    const mouthSettings = {
        depth: 0.3,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.02,
        bevelSegments: 5,  // Smooth bevel
        curveSegments: 20  // High smoothness
    };

    const mouthGeometry = new THREE.ExtrudeGeometry(mouthShape, mouthSettings);
    const mouthMaterial = new THREE.MeshStandardMaterial({ color: '#000000' });
    const mouthMesh = new THREE.Mesh(mouthGeometry, mouthMaterial);

    mouthMesh.rotation.set(-Math.PI, 0, 0);  // Face forward
    mouthMesh.position.set(0, -5.8, 2.5);
    mouthMesh.scale.set(1.0, 1.0, 1);

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
  // Prepare video texture
  videoTexture.wrapS = THREE.ClampToEdgeWrapping;
  videoTexture.wrapT = THREE.ClampToEdgeWrapping;

  const geometry = new THREE.CircleGeometry(18, 64);
  const material = new THREE.MeshBasicMaterial({ map: videoTexture, side: THREE.DoubleSide });
  const blurMaterial = new THREE.ShaderMaterial({
    uniforms: {
        tDiffuse: { value: videoTexture },
        resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        direction: { value: new THREE.Vector2(1.0, 0.0) }, // Horizontal blur
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 resolution;
        uniform vec2 direction;
        varying vec2 vUv;

        void main() {
            vec4 color = vec4(0.0);
            float total = 0.0;

            float offset = 1.0 / 512.0;

            for (float t = -10.0; t <= 10.0; t++) {
                float percent = (t + 10.0) / 20.0;
                float weight = 1.0 - abs(percent - 0.5) * 2.0;
                vec2 uvOffset = direction * t * offset;
                color += texture2D(tDiffuse, vUv + uvOffset) * weight;
                total += weight;
            }

            gl_FragColor = color / total;
        }
    `,
    transparent: false
});


  const videoCircle = new THREE.Mesh(geometry, material);

  // Correct orientation
  videoCircle.rotation.x = -Math.PI;
  videoCircle.rotation.z = Math.PI;

  videoCircle.position.z = -0.51;

  clockGroup.add(videoCircle);

  // Start video
  video.currentTime = 0;
  video.play();

  // Set video as background
  scene.background = videoTexture();

  video.onended = () => {
    console.log('Video finished, rotating forward...');

    gsap.to(clockGroup.rotation, { 
      y: "+=" + (Math.PI * 9),  // Spin forward back to original
      duration: 2, 
      ease: "power2.inOut",
      onComplete: () => {
        // Reset background
        scene.background = new THREE.Color('#FFF176');
        isVideoPlaying = false; // Resume clock updates
      }
    });
  };
}


function updateClock() {
  if (isVideoPlaying) return; // Pause clock updates while video is playing

  const previousStep = currentStep;
  currentStep = (currentStep + 1) % totalSteps;

  const rotation = currentStep * angleStep;
  minuteHand.rotation.z = -rotation;

  createSector(currentStep);

  if (previousStep === totalSteps - 1 && currentStep === 0) {
    // Immediately spin backwards when the last step is completed
    isVideoPlaying = true;

    gsap.to(clockGroup.rotation, { 
      y: "-=" + (Math.PI * 9),  // Spin backwards
      duration: 2, 
      ease: "power2.inOut",
      onComplete: () => {
        createVideoOnBack();
      }
    });
  }
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