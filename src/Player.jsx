import * as THREE from "three";
import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import { PointerLockControls, OrbitControls } from "@react-three/drei";

const SPEED = 5;
const direction = new THREE.Vector3();
const frontVector = new THREE.Vector3();
const sideVector = new THREE.Vector3();

export const Player = () => {
    const rigidBody = useRef();
    const controlsRef = useRef(); // 1. 获取控件的引用
    const keys = useRef({
        forward: false,
        backward: false,
        left: false,
        right: false,
        jump: false,
    });

    // 2. 强制锁定逻辑
    useEffect(() => {
        // 这是一个全局点击监听器
        const handleGlobalClick = () => {
            if (controlsRef.current) {
                console.log("正在尝试锁定鼠标...");
                controlsRef.current.lock(); // 手动触发锁定
            }
        };

        // 监听整个文档的点击，不仅仅是 Canvas
        document.addEventListener("click", handleGlobalClick);

        return () => {
            document.removeEventListener("click", handleGlobalClick);
        };
    }, []);

    // 键盘监听
    useEffect(() => {
        const handleKeyDown = (e) => {
            // console.log("按键按下:", e.code) // 打开这个注释可以看到按键是否生效
            switch (e.code) {
                case "KeyW":
                case "ArrowUp":
                    keys.current.forward = true;
                    break;
                case "KeyS":
                case "ArrowDown":
                    keys.current.backward = true;
                    break;
                case "KeyA":
                case "ArrowLeft":
                    keys.current.left = true;
                    break;
                case "KeyD":
                case "ArrowRight":
                    keys.current.right = true;
                    break;
                case "Space":
                    keys.current.jump = true;
                    break;
            }
        };
        const handleKeyUp = (e) => {
            switch (e.code) {
                case "KeyW":
                case "ArrowUp":
                    keys.current.forward = false;
                    break;
                case "KeyS":
                case "ArrowDown":
                    keys.current.backward = false;
                    break;
                case "KeyA":
                case "ArrowLeft":
                    keys.current.left = false;
                    break;
                case "KeyD":
                case "ArrowRight":
                    keys.current.right = false;
                    break;
                case "Space":
                    keys.current.jump = false;
                    break;
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, []);

    useFrame((state) => {
        if (!rigidBody.current) return;

        const velocity = rigidBody.current.linvel();

        // 计算移动
        frontVector.set(
            0,
            0,
            Number(keys.current.backward) - Number(keys.current.forward)
        );
        sideVector.set(
            Number(keys.current.left) - Number(keys.current.right),
            0,
            0
        );
        direction
            .subVectors(frontVector, sideVector)
            .normalize()
            .multiplyScalar(SPEED)
            .applyEuler(state.camera.rotation);

        // 跳跃
        if (keys.current.jump && Math.abs(velocity.y) < 0.1) {
            rigidBody.current.applyImpulse({ x: 0, y: 5, z: 0 }, true);
        }

        // 应用速度
        rigidBody.current.setLinvel(
            { x: direction.x, y: velocity.y, z: direction.z },
            true
        );

        // 相机绑定
        const pos = rigidBody.current.translation();
        state.camera.position.set(pos.x, pos.y + 1.5, pos.z);
    });

    return (
        <>
            {/* 
         👇 临时改成 OrbitControls 
         如果不按鼠标就能看到画面，按住左键能旋转，右键能平移，
         说明场景是好的，只是 PointerLock 有问题。
      */}
            <OrbitControls makeDefault />

            <RigidBody
                ref={rigidBody}
                colliders="ball"
                restitution={0}
                friction={1}
                linearDamping={0.5}
                enabledRotations={[false, false, false]}
                position={[0, 5, 10]}
            >
                <mesh>
                    <sphereGeometry args={[0.5]} />
                    <meshStandardMaterial color="orange" />
                </mesh>
            </RigidBody>
        </>
    );
};
