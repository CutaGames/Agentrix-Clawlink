import Head from 'next/head';

export default function AdminProductReview() {
  return (
    <>
      <Head>
        <title>Product Review - Agentrix Admin</title>
      </Head>
      <div className="min-h-screen bg-gray-50">
        <div className="ml-64 p-8">
          <h2 className="text-3xl font-bold text-gray-900">Product Review</h2>
          <p className="text-gray-600 mt-2">Review and approve submitted products</p>
          <div className="mt-8 text-center text-gray-500">
            Coming soon...
          </div>
        </div>
      </div>
    </>
  );
}
