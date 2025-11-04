"use client";
import {useAuth} from "@/app/providers";


export default function RequireRole({allow, children}: {
    allow: ("ADMIN" | "MANAGER" | "STAFF")[];
    children: React.ReactNode;
}) {
    const {user} = useAuth();
    if (!user) return null;
    return allow.includes(user.role) ? <>{children}</> : <div>403 Forbidden</div>;
}


