import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function AgentDashboard(): JSX.Element | null {
  const router = useRouter();

  useEffect(() => {
    router.replace('/workbench');
  }, [router]);

  return null;
}
