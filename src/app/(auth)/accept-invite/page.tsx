"use client";
import {useEffect, useState} from "react";
import {useRouter, useSearchParams} from "next/navigation";
import {Button, Card, Form, Input, message} from "antd";


export default function AcceptInvitePage() {
    const params = useSearchParams();
    const router = useRouter();
    const token = params.get("token");
    const [needsRegister, setNeedsRegister] = useState(false);


    useEffect(() => {
        (async () => {
            if (!token) return;
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/invitations/validate/?token=${token}`);
            if (res.status === 404 || res.status === 410) message.error("Token invalid/expired");
            if (res.status === 200) {
                const data = await res.json();
                setNeedsRegister(data.requires_register === true);
            }
        })();
    }, [token]);


    const onRegister = async (v: any) => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/register/`, {
            method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({...v, token})
        });
        if (!res.ok) return message.error("Registrasi gagal");
        message.success("Registrasi & accept berhasil");
        router.replace("/login");
    };


    const onAccept = async () => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/invitations/accept/`, {
            method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({token})
        });
        if (!res.ok) return message.error("Accept gagal");
        message.success("Undangan diterima");
        router.replace("/login");
    };


    return (
        <Card title="Accept Invitation" style={{maxWidth: 420, margin: "64px auto"}}>
            {needsRegister ? (
                <Form layout="vertical" onFinish={onRegister}>
                    <Form.Item name="email" label="Email" rules={[{required: true}]}><Input/></Form.Item>
                    <Form.Item name="password" label="Password" rules={[{required: true}]}><Input.Password/></Form.Item>
                    <Button type="primary" htmlType="submit" block>Register & Accept</Button>
                </Form>
            ) : (
                <Button type="primary" onClick={onAccept} block>Accept</Button>
            )}
        </Card>
    );
}