"use client";

import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";

function AgentPageContent() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return <div style={{ width: '100vw', height: '100vh', background: '#FFFFFF' }} />;
}

export default function AgentPage() {
  return (
    <Suspense fallback={<div style={{ width: '100vw', height: '100vh', background: '#FFFFFF' }} />}>
      <AgentPageContent />
    </Suspense>
  );
}
