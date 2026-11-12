import * as THREE from "three";
import { CSS3DRenderer, CSS3DObject } from "three/addons/renderers/CSS3DRenderer.js";
import { TrackballControls } from "three/addons/controls/TrackballControls.js";
import TWEEN from "three/addons/libs/tween.module.js";

const RED = "#EF3022";
const ORANGE = "#FDCA35";
const GREEN = "#3A9F48";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 1, 10000);
camera.position.z = 3600;

const renderer = new CSS3DRenderer();
const container = document.getElementById("threeContainer");

const controls = new TrackballControls(camera, renderer.domElement);
controls.rotateSpeed = 0.5;
controls.minDistance = 300;
controls.maxDistance = 8000;

let objects = [];
let targets = {};
let started = false;


function getColor(netWorth) {
    const amount = parseFloat(netWorth.replace(/[^0-9.-]/g, "")) || 0;

    if (amount > 200000) return GREEN;
    if (amount > 100000) return ORANGE;
    return RED;
}

function createTile(record) {
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.style.setProperty("--c", getColor(record["Net Worth"]));

    const top = document.createElement("div");
    top.className = "top";
    top.innerHTML = "<span></span><span></span>";
    top.children[0].textContent = record.Country;
    top.children[1].textContent = record.Age;

    const img = document.createElement("img");
    img.src = record.Photo;
    img.alt = record.Name;
    img.referrerPolicy = "no-referrer";
    img.onerror = () => { img.style.visibility = "hidden"; };

    const name = document.createElement("div");
    name.className = "name";
    name.textContent = record.Name;

    const interest = document.createElement("div");
    interest.className = "interest";
    interest.textContent = record.Interest;

    tile.append(top, img, name, interest);
    return tile;
}

// ----- table layout (periodic table shape) -----

const range = (from, to) =>
    Array.from({ length: to - from + 1 }, (_, i) => from + i);

// columns used in each row, row 8 is left empty
const tableRows = {
    1: [1, 18],
    2: [...range(1, 2), ...range(13, 18)],
    3: [...range(1, 2), ...range(13, 18)],
    4: range(1, 18),
    5: range(1, 18),
    6: [1, 2, ...range(4, 18)],
    7: [1, 2, ...range(4, 18)],
    9: range(4, 18),
    10: range(4, 18)
};

const slots = [];
for (const row in tableRows) {
    tableRows[row].forEach(col => slots.push({ col, row: Number(row) }));
}

function tablePosition(i) {
    const shiftUp = 600;

    if (i < slots.length) {
        const { col, row } = slots[i];
        return {
            x: (col - 9.5) * 160,
            y: (5.5 - row) * 200 + shiftUp
        };
    }

    // tiles that don't fit the shape go in rows below it
    const k = i - slots.length;
    return {
        x: ((k % 18) - 8.5) * 160,
        y: (5.5 - (12 + Math.floor(k / 18))) * 200 + shiftUp
    };
}

// ----- all layouts -----

function buildTargets(count) {
    targets = { table: [], sphere: [], helix: [], grid: [] };

    for (let i = 0; i < count; i++) {
        // table
        const table = new THREE.Object3D();
        const p = tablePosition(i);
        table.position.set(p.x, p.y, 0);
        targets.table.push(table);

        // sphere
        const sphere = new THREE.Object3D();
        const phi = Math.acos(-1 + (2 * i) / count);
        const theta = Math.sqrt(count * Math.PI) * phi;
        sphere.position.setFromSphericalCoords(1100, phi, theta);
        sphere.lookAt(sphere.position.clone().multiplyScalar(2));
        targets.sphere.push(sphere);

        // double helix: even tiles on one strand, odd tiles on the other
        const helix = new THREE.Object3D();
        const strand = i % 2;
        const step = Math.floor(i / 2);
        const angle = step * 0.6 + strand * Math.PI;
        const radius = 700;

        helix.position.set(
            radius * Math.sin(angle),
            1500 - step * 30,
            radius * Math.cos(angle)
        );
        // face outward
        helix.lookAt(helix.position.x * 2, helix.position.y, helix.position.z * 2);
        targets.helix.push(helix);

        // grid 5 x 4 x 10
        const grid = new THREE.Object3D();
        grid.position.set(
            ((i % 5) - 2) * 240,
            (1.5 - (Math.floor(i / 5) % 4)) * 280,
            (4.5 - Math.floor(i / 20)) * 450
        );
        targets.grid.push(grid);
    }
}

function moveTo(layout, duration = 1500) {
    TWEEN.removeAll();

    objects.forEach((object, i) => {
        const target = targets[layout][i];

        new TWEEN.Tween(object.position)
            .to(target.position, duration)
            .easing(TWEEN.Easing.Exponential.InOut)
            .start();

        new TWEEN.Tween(object.rotation)
            .to(target.rotation, duration)
            .easing(TWEEN.Easing.Exponential.InOut)
            .start();
    });
}

function resize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
    controls.handleResize();
}

function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();
    controls.update();
    renderer.render(scene, camera);
}

window.addEventListener("resize", resize);

document.querySelectorAll("#menu button").forEach(button => {
    button.addEventListener("click", () => moveTo(button.dataset.layout));
});

window.addEventListener("sheetDataLoaded", (event) => {
    const records = event.detail;
    if (!records.length) return;

    document.getElementById("visualizationSection").hidden = false;
    container.appendChild(renderer.domElement);
    resize();

    scene.clear();
    objects = [];
    buildTargets(records.length);

    records.forEach(record => {
        const object = new CSS3DObject(createTile(record));
        // start at a random spot, then fly into the table
        object.position.set(
            Math.random() * 4000 - 2000,
            Math.random() * 4000 - 2000,
            Math.random() * 4000 - 2000
        );
        scene.add(object);
        objects.push(object);
    });

    moveTo("table", 2000);

    if (!started) {
        started = true;
        animate();
    }
});