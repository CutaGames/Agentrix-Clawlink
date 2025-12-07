import Head from 'next/head';
import { DashboardLayout } from '../../../components/layout/DashboardLayout';
import { MerchantAutomationPanel } from '../../../components/merchant/MerchantAutomationPanel';

export default function MerchantAutomation() {
  return (
    <>
      <Head>
        <title>商户自动化 - Agentrix</title>
      </Head>
      <DashboardLayout userType="merchant">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6">商户自动化</h1>
          <MerchantAutomationPanel />
        </div>
      </DashboardLayout>
    </>
  );
}

