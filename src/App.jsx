import React, { useState, useEffect, useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
    Sky,
    PointerLockControls,
    Html,
    useTexture,
    MeshReflectorMaterial,
    SpotLight,
    useGLTF,
    Environment,
} from "@react-three/drei";
import {
    Physics,
    RigidBody,
    CuboidCollider,
    CapsuleCollider,
} from "@react-three/rapier";
import * as THREE from "three";
import { create } from "zustand";

// === 1. 状态管理 (新增 isLocked 控制) ===
const useStore = create((set) => ({
    activePost: null,
    isLocked: false, // 是否处于漫游锁定状态
    openPost: (post) => set({ activePost: post, isLocked: false }),
    closePost: () => set({ activePost: null, isLocked: true }), // 关闭文章时自动请求锁定
    setLocked: (status) => set({ isLocked: status }),
}));

// === 2. 模拟数据 ===
const POSTS = [
    {
        id: 1,
        title: "花街",
        pos: [-5.2, 2.5, -5],
        rot: [0, Math.PI / 2, 0],
        content: "暖阳下的花街...",
        img: "/flower.png",
    },
    {
        id: 2,
        title: "空荡的街道",
        pos: [-5.2, 2.5, -15],
        rot: [0, Math.PI / 2, 0],
        content: "午后的宁静...",
        img: "/stree.png",
    },
    {
        id: 3,
        title: "路边巴士",
        pos: [5.2, 2.5, -5],
        rot: [0, -Math.PI / 2, 0],
        content: "复古的色调...",
        img: "/bus.png",
    },
    {
        id: 4,
        title: "吹萨克斯的老人",
        pos: [5.2, 2.5, -15],
        rot: [0, -Math.PI / 2, 0],
        content: "爵士乐的灵魂...",
        img: "/man.png",
    },
];

// === 3. 玩家组件 (脚底感应器版 - 完美跳跃手感) ===
const Player = () => {
    const rigidBody = useRef();
    const keys = useRef({
        w: false,
        s: false,
        a: false,
        d: false,
        space: false,
    });
    const { activePost } = useStore();
    const isOnFloor = useRef(false);

    useEffect(() => {
        const onKeyDown = (e) => {
            switch (e.code) {
                case "KeyW":
                    keys.current.w = true;
                    break;
                case "KeyS":
                    keys.current.s = true;
                    break;
                case "KeyA":
                    keys.current.a = true;
                    break;
                case "KeyD":
                    keys.current.d = true;
                    break;
                case "Space":
                    keys.current.space = true;
                    break;
            }
        };
        const onKeyUp = (e) => {
            switch (e.code) {
                case "KeyW":
                    keys.current.w = false;
                    break;
                case "KeyS":
                    keys.current.s = false;
                    break;
                case "KeyA":
                    keys.current.a = false;
                    break;
                case "KeyD":
                    keys.current.d = false;
                    break;
                case "Space":
                    keys.current.space = false;
                    break;
            }
        };
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
        };
    }, []);

    useFrame((state) => {
        if (!rigidBody.current) return;
        if (activePost) {
            rigidBody.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
            return;
        }
        const { w, s, a, d, space } = keys.current;
        const velocity = rigidBody.current.linvel();
        const direction = new THREE.Vector3();
        const frontVector = new THREE.Vector3(0, 0, Number(s) - Number(w));
        const sideVector = new THREE.Vector3(Number(a) - Number(d), 0, 0);
        direction
            .subVectors(frontVector, sideVector)
            .normalize()
            .multiplyScalar(5)
            .applyEuler(state.camera.rotation);

        let yVelocity = velocity.y;
        if (space && isOnFloor.current) {
            yVelocity = 6;
            isOnFloor.current = false;
        }
        rigidBody.current.setLinvel(
            { x: direction.x, y: yVelocity, z: direction.z },
            true
        );
        const pos = rigidBody.current.translation();
        state.camera.position.set(pos.x, pos.y + 1.5, pos.z);
    });

    return (
        <RigidBody
            ref={rigidBody}
            colliders={false} // 手动定义碰撞体
            restitution={0}
            friction={1}
            position={[0, 5, 0]} // 出生在半空，掉落在地上
            enabledRotations={[false, false, false]}
        >
            <CapsuleCollider args={[0.5, 0.5]} />
            <CuboidCollider
                position={[0, -1.05, 0]}
                args={[0.2, 0.1, 0.2]}
                sensor
                onIntersectionEnter={() => {
                    isOnFloor.current = true;
                }}
                onIntersectionExit={() => {
                    isOnFloor.current = false;
                }}
            />
        </RigidBody>
    );
};
// === 图片加载组件 ===
const Photo = ({ url }) => {
    // 1. 使用 useTexture 加载纹理
    // 注意：如果 public 文件夹里没有对应的图片，这行代码会让 Suspense 一直等待
    // 为了防止这种情况，你可以暂时把 url 换成网图，或者确保本地文件存在
    const texture = useTexture(url);

    return (
        // 2. 调整位置：0.15 比画框表面 (0.1) 稍微突出一点，防止重叠
        <mesh position={[0, 0, 0.15]}>
            <planeGeometry args={[2.8, 2]} />
            {/* toneMapped={false} 让图片颜色不受光照影响变暗，保持原色 */}
            <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
    );
};

// === 4. 画框组件 ===
const Frame = ({ data }) => {
    const [hovered, setHover] = useState(false);
    const openPost = useStore((state) => state.openPost);

    return (
        <group position={data.pos} rotation={data.rot}>
            {/* 暖色聚光灯 */}
            <SpotLight
                position={[0, 3, 2]}
                target-position={[0, 0, 0]}
                penumbra={0.2}
                angle={0.6}
                attenuation={5}
                anglePower={5}
                intensity={8}
                color="#ffeebb"
                castShadow
            />

            {/* 画框主体 */}
            <RigidBody type="fixed" colliders="cuboid">
                <mesh
                    onPointerOver={() => setHover(true)}
                    onPointerOut={() => setHover(false)}
                    onClick={(e) => {
                        e.stopPropagation();
                        openPost(data);
                        document.exitPointerLock();
                    }}
                >
                    {/* 画框尺寸：厚度 0.2，所以表面在 z=0.1 */}
                    <boxGeometry args={[3.2, 2.4, 0.2]} />
                    <meshStandardMaterial
                        color={hovered ? "#8d6e63" : "#5d4037"}
                        roughness={0.6}
                        metalness={0.1}
                    />
                </mesh>
            </RigidBody>

            {/* 
               🔥 关键修复 🔥 
               使用 Suspense 包裹 Photo，防止单张图片加载失败导致整个 App 崩溃。
               如果图片还没加载出来，显示一个灰色的占位板。
            */}
            <Suspense
                fallback={
                    <mesh position={[0, 0, 0.15]}>
                        <planeGeometry args={[2.8, 2]} />
                        <meshStandardMaterial color="#444" />
                    </mesh>
                }
            >
                <Photo url={data.img} />
            </Suspense>

            {/* 标签牌 */}
            <Html
                transform
                position={[0, -1.5, 0]}
                scale={0.3}
                style={{ pointerEvents: "none" }}
            >
                <div
                    style={{
                        color: "#3e2723",
                        fontFamily: "'Times New Roman', serif",
                        textAlign: "center",
                        backgroundColor: "#f5f5dc",
                        padding: "10px 25px",
                        border: "2px solid #5d4037",
                        boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                        borderRadius: "2px",
                    }}
                >
                    <div
                        style={{
                            fontSize: "24px",
                            fontWeight: "bold",
                            letterSpacing: "1px",
                        }}
                    >
                        {data.title}
                    </div>
                    <div
                        style={{
                            fontSize: "14px",
                            fontStyle: "italic",
                            marginTop: "5px",
                            opacity: 0.8,
                        }}
                    >
                        Vintage Collection
                    </div>
                </div>
            </Html>
        </group>
    );
};

// === 5. 场景组件 ===
const GalleryScene = () => {
    return (
        <>
            {/* 草地 - 使用 Box 加厚 */}
            <RigidBody type="fixed" friction={2}>
                <mesh position={[0, -1, 0]}>
                    <boxGeometry args={[100, 2, 130]} />
                    <meshStandardMaterial color="#5c8d48" roughness={1} />
                </mesh>
            </RigidBody>

            {[0, -10, -20, -30, -40].map((z) => (
                <pointLight
                    key={z}
                    position={[0, 8, z]}
                    intensity={5}
                    distance={15}
                    color="#fff8e1"
                    castShadow
                />
            ))}
            <RigidBody type="fixed" friction={2}>
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -20]}>
                    <boxGeometry args={[20, 80, 0.2]} />
                    <MeshReflectorMaterial
                        blur={[400, 100]}
                        resolution={512}
                        mixBlur={1}
                        mixStrength={10}
                        roughness={0.7}
                        depthScale={1}
                        minDepthThreshold={0.4}
                        maxDepthThreshold={1.4}
                        color="#6d4c41"
                        metalness={0}
                        flames={2}
                    />
                </mesh>
            </RigidBody>
            <RigidBody type="fixed">
                <mesh position={[-5.4, 0.25, -20]}>
                    <boxGeometry args={[0.2, 0.5, 80]} />
                    <meshStandardMaterial color="#3e2723" />
                </mesh>
                <mesh position={[5.4, 0.25, -20]}>
                    <boxGeometry args={[0.2, 0.5, 80]} />
                    <meshStandardMaterial color="#3e2723" />
                </mesh>
            </RigidBody>
            <RigidBody type="fixed">
                <mesh position={[-5.6, 5, -20]}>
                    <boxGeometry args={[0.5, 10, 80]} />
                    <meshStandardMaterial color="#f5f5dc" roughness={1} />
                </mesh>
                <mesh position={[5.6, 5, -20]}>
                    <boxGeometry args={[0.5, 10, 80]} />
                    <meshStandardMaterial color="#f5f5dc" roughness={1} />
                </mesh>
                {/* <mesh position={[0, 5, -55]}>
                    <boxGeometry args={[12, 10, 1]} />
                    <meshStandardMaterial color="#f5f5dc" roughness={1} />
                </mesh> */}
                <mesh position={[0, 10, -20]}>
                    <boxGeometry args={[20, 1, 80]} />
                    <meshStandardMaterial color="#ffffff" />
                </mesh>
            </RigidBody>
            {POSTS.map((post) => (
                <Frame key={post.id} data={post} />
            ))}
            <RigidBody type="fixed" position={[0, 0.4, -10]}>
                <mesh>
                    <boxGeometry args={[2.5, 0.1, 1]} />
                    <meshStandardMaterial color="#3e2723" />
                </mesh>
                <mesh position={[-1, -0.2, 0.3]}>
                    <cylinderGeometry args={[0.05, 0.05, 0.4]} />
                    <meshStandardMaterial color="#222" />
                </mesh>
                <mesh position={[1, -0.2, 0.3]}>
                    <cylinderGeometry args={[0.05, 0.05, 0.4]} />
                    <meshStandardMaterial color="#222" />
                </mesh>
                <mesh position={[-1, -0.2, -0.3]}>
                    <cylinderGeometry args={[0.05, 0.05, 0.4]} />
                    <meshStandardMaterial color="#222" />
                </mesh>
                <mesh position={[1, -0.2, -0.3]}>
                    <cylinderGeometry args={[0.05, 0.05, 0.4]} />
                    <meshStandardMaterial color="#222" />
                </mesh>
            </RigidBody>

            {/* 放置白色石雕 */}
            <ThinkerStatue position={[0, 0.2, -45]} />
        </>
    );
};

// === 白色石雕 (带材质处理) ===
const ThinkerStatue = ({ position }) => {
    // ⚠️ 这里的链接是一个免费的半身像模型，用于演示。
    // 请下载真正的 "thinker.glb" 放入 public 文件夹，并将下面改成 useGLTF("/thinker.glb")
    const { scene } = useGLTF("/angel_4k.glb");

    useEffect(() => {
        scene.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                // // 赋予青铜材质
                // child.material = new THREE.MeshStandardMaterial({
                //     color: "#4a3c31",
                //     roughness: 0.3,
                //     metalness: 0.6,
                // });
            }
        });
    }, [scene]);

    return (
        <group position={position}>
            {/* 黑色大理石底座 */}
            <RigidBody type="fixed" colliders="cuboid">
                <mesh position={[0, 0.5, 0]}>
                    {/* <boxGeometry args={[2, 1, 2]} /> */}
                    <MeshReflectorMaterial
                        blur={[300, 100]}
                        resolution={512}
                        mixBlur={1}
                        mixStrength={20}
                        roughness={0.2}
                        depthScale={1}
                        minDepthThreshold={0.4}
                        maxDepthThreshold={1.4}
                        color="#111"
                        metalness={0.5}
                    />
                </mesh>
            </RigidBody>

            {/* 雕像 */}
            {/* 根据模型不同，可能需要调整 scale 和 rotation */}
            <primitive
                object={scene}
                scale={2}
                position={[0, 0, 0]}
                rotation={[0, 0, 0]}
            />

            {/* 专属灯光 */}
            <SpotLight
                position={[0, 5, 3]}
                target-position={[0, 2, 0]}
                penumbra={0.5}
                angle={0.5}
                intensity={15}
                color="#fff"
                castShadow
            />
        </group>
    );
};

// === 6. UI (修复交互逻辑) ===
const UI = () => {
    const { activePost, closePost, isLocked } = useStore();

    // 1. 如果有文章打开，显示文章弹窗
    if (activePost) {
        return (
            <div
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    background: "rgba(245, 245, 220, 0.9)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 20,
                    pointerEvents: "auto",
                }}
            >
                <div
                    style={{
                        background: "#fff",
                        padding: "50px",
                        width: "500px",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                        border: "1px solid #d7ccc8",
                        position: "relative",
                    }}
                >
                    <img
                        src={activePost.img}
                        alt=""
                        style={{
                            width: "100%",
                            marginBottom: "20px",
                            boxShadow: "0 5px 15px rgba(0,0,0,0.1)",
                        }}
                    />
                    <h2
                        style={{
                            color: "#3e2723",
                            fontFamily: "serif",
                            marginBottom: "10px",
                        }}
                    >
                        {activePost.title}
                    </h2>
                    <p style={{ color: "#5d4037", lineHeight: "1.8" }}>
                        {activePost.content}
                    </p>
                    <button
                        onClick={closePost}
                        style={{
                            marginTop: "30px",
                            padding: "10px 30px",
                            background: "transparent",
                            border: "1px solid #8d6e63",
                            color: "#5d4037",
                            cursor: "pointer",
                            fontFamily: "serif",
                            fontSize: "16px",
                        }}
                    >
                        CLOSE
                    </button>
                </div>
            </div>
        );
    }

    // 2. 如果没有锁定 (即刚进入页面，或按了ESC)，显示“点击开始”
    if (!isLocked) {
        return (
            <div
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    background: "rgba(0,0,0,0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 30,
                    pointerEvents: "none", // 容器不拦截，让按钮拦截
                }}
            >
                <div
                    style={{
                        background: "rgba(0,0,0,0.6)",
                        padding: "20px 40px",
                        borderRadius: "8px",
                        color: "white",
                        fontFamily: "serif",
                        textAlign: "center",
                        pointerEvents: "auto",
                        cursor: "pointer",
                    }}
                    // 点击这个覆盖层，触发锁定
                    onClick={() => {
                        const canvas = document.querySelector("canvas");
                        if (canvas) canvas.requestPointerLock();
                    }}
                >
                    <h1>CLICK TO EXPLORE</h1>
                    <p
                        style={{
                            fontSize: "14px",
                            marginTop: "10px",
                            opacity: 0.8,
                        }}
                    >
                        WASD to Move, Click paintings to Read
                    </p>
                </div>
            </div>
        );
    }

    // 3. 正常游戏中的准心
    return (
        <div
            style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                pointerEvents: "none",
                color: "#3e2723",
                zIndex: 10,
                fontSize: "24px",
                opacity: 0.5,
            }}
        >
            +
        </div>
    );
};

// === 7. 主程序 ===
export default function App() {
    // 获取 Store 方法用于同步状态
    const setLocked = useStore((state) => state.setLocked);

    return (
        // 去掉外层 div 的背景色，直接在 Canvas 里设置，防止点击事件被拦截
        <div style={{ width: "100vw", height: "100vh" }}>
            <Canvas shadows camera={{ fov: 50, position: [0, 2, 5] }}>
                {/* 1. 背景色放在 Canvas 内部，确保 Canvas 接收点击 */}
                <color attach="background" args={["#f0f0e0"]} />

                {/* <Sky
                    sunPosition={[100, 50, 100]}
                    turbidity={0.5}
                    rayleigh={0.5}
                /> */}
                <ambientLight intensity={0.8} />
                <directionalLight
                    position={[10, 20, 10]}
                    intensity={1.5}
                    castShadow
                    shadow-mapSize={[2048, 2048]}
                />
                <Environment
                    files="/ballroom_2k.exr"
                    background={true} // 是否直接把这张图当背景看
                    blur={0.002} // 背景模糊度
                />
                <fog attach="fog" args={["#f0f0e0", 10, 60]} />

                {/* 
                   PointerLockControls 核心修复：
                   1. 移除 selector="#root"，让它默认绑定到 Canvas
                   2. 监听 onLock 和 onUnlock，同步状态到 Store
                */}
                <PointerLockControls
                    onLock={() => setLocked(true)}
                    onUnlock={() => setLocked(false)}
                />

                <Suspense fallback={null}>
                    <Physics gravity={[0, -9.8, 0]}>
                        <Player />
                        <GalleryScene />
                    </Physics>
                </Suspense>
            </Canvas>
            <UI />
        </div>
    );
}
