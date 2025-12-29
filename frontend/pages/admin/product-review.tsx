import { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/admin/AdminLayout';

interface Review {
  id: string;
  productId: string;
  merchantId: string;
  type: 'new_product' | 'update' | 'reactivation';
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'revision_requested';
  productSnapshot: {
    name: string;
    description: string;
    price: number;
    category: string;
    productType: string;
    images: string[];
  };
  autoReviewResult?: {
    score: number;
    passed: boolean;
    issues: Array<{
      field: string;
      issue: string;
      severity: 'high' | 'medium' | 'low';
    }>;
  };
  merchant?: {
    nickname: string;
    email: string;
  };
  reviewerComment?: string;
  createdAt: string;
  reviewedAt?: string;
}

interface Stats {
  pending: number;
  inReview: number;
  approvedToday: number;
  rejectedToday: number;
}

export default function AdminProductReview() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const apiBaseUrl = typeof window !== 'undefined'
    ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:3001/api'
      : 'https://api.agentrix.top/api')
    : 'http://localhost:3001/api';

  useEffect(() => {
    fetchReviews();
    fetchStats();
  }, [statusFilter]);

  const getToken = () => localStorage.getItem('admin_token');

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getToken();
      if (!token) {
        setError('鏈櫥褰曪紝璇峰厛鐧诲綍绠＄悊鍚庡彴');
        return;
      }

      const response = await fetch(
        `${apiBaseUrl}/products/review/admin/list?status=${statusFilter}&pageSize=50`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 401) {
        setError('鐧诲綍宸茶繃鏈燂紝璇烽噸鏂扮櫥褰?);
        localStorage.removeItem('admin_token');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || `璇锋眰澶辫触: ${response.status}`);
        return;
      }

      const data = await response.json();
      setReviews(data.data?.reviews || []);
    } catch (err: any) {
      setError(err.message || '鑾峰彇瀹℃牳鍒楄〃澶辫触');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${apiBaseUrl}/products/review/admin/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleReviewAction = async (action: 'approve' | 'reject' | 'request_revision') => {
    if (!selectedReview) return;
    
    if (action === 'reject' && !rejectionReason.trim()) {
      alert('璇疯緭鍏ユ嫆缁濆師鍥?);
      return;
    }

    setActionLoading(true);
    try {
      const token = getToken();
      const response = await fetch(`${apiBaseUrl}/products/review/admin/action`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewId: selectedReview.id,
          action,
          comment: reviewComment,
          rejectionReason: action === 'reject' ? rejectionReason : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || '鎿嶄綔澶辫触');
      }

      alert(action === 'approve' ? '鍟嗗搧宸叉壒鍑? : action === 'reject' ? '鍟嗗搧宸叉嫆缁? : '宸茶姹備慨鏀?);
      setSelectedReview(null);
      setReviewComment('');
      setRejectionReason('');
      fetchReviews();
      fetchStats();
    } catch (err: any) {
      alert(err.message || '鎿嶄綔澶辫触');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '寰呭鏍? },
      in_review: { bg: 'bg-blue-100', text: 'text-blue-800', label: '瀹℃牳涓? },
      approved: { bg: 'bg-green-100', text: 'text-green-800', label: '宸查€氳繃' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: '宸叉嫆缁? },
      revision_requested: { bg: 'bg-orange-100', text: 'text-orange-800', label: '闇€淇敼' },
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const types: Record<string, string> = {
      new_product: '鏂板晢鍝?,
      update: '鏇存柊',
      reactivation: '閲嶆柊涓婃灦',
    };
    return types[type] || type;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <>
      <Head>
        <title>鍟嗗搧瀹℃牳 - Agentrix 绠＄悊鍚庡彴</title>
      </Head>
      <AdminLayout title="鍟嗗搧瀹℃牳" description="瀹℃牳鍟嗘埛鎻愪氦鐨勫晢鍝?>
        {/* 缁熻鍗＄墖 */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-yellow-700">寰呭鏍?/div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.inReview}</div>
              <div className="text-sm text-blue-700">瀹℃牳涓?/div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">{stats.approvedToday}</div>
              <div className="text-sm text-green-700">浠婃棩閫氳繃</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-600">{stats.rejectedToday}</div>
              <div className="text-sm text-red-700">浠婃棩鎷掔粷</div>
            </div>
          </div>
        )}

        {/* 绛涢€夊櫒 */}
        <div className="mb-6 flex gap-2">
          {['pending', 'in_review', 'approved', 'rejected', 'revision_requested'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {getStatusBadge(status)}
            </button>
          ))}
        </div>

        {/* 瀹℃牳鍒楄〃 */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">鍔犺浇涓?..</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-600">{error}</p>
            <button onClick={fetchReviews} className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
              閲嶈瘯
            </button>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            鏆傛棤瀹℃牳璇锋眰
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">鍟嗗搧</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">鍟嗘埛</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">绫诲瀷</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">鐘舵€?/th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">鑷姩璇勫垎</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">鎻愪氦鏃堕棿</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">鎿嶄綔</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reviews.map((review) => (
                  <tr key={review.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {review.productSnapshot.images?.[0] && (
                          <img
                            src={review.productSnapshot.images[0]}
                            alt=""
                            className="w-10 h-10 rounded object-cover mr-3"
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{review.productSnapshot.name}</div>
                          <div className="text-sm text-gray-500">楼{review.productSnapshot.price}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{review.merchant?.nickname || '-'}</div>
                      <div className="text-sm text-gray-500">{review.merchant?.email || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getTypeBadge(review.type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(review.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {review.autoReviewResult && (
                        <div className={`text-sm font-medium ${
                          review.autoReviewResult.score >= 80 ? 'text-green-600' :
                          review.autoReviewResult.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {review.autoReviewResult.score}鍒?
                          {review.autoReviewResult.issues.length > 0 && (
                            <span className="text-gray-400 ml-1">
                              ({review.autoReviewResult.issues.length}涓棶棰?
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(review.createdAt).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedReview(review)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        瀹℃牳
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 瀹℃牳璇︽儏妯℃€佹 */}
        {selectedReview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="text-lg font-semibold">瀹℃牳鍟嗗搧璇︽儏</h3>
                <button
                  onClick={() => setSelectedReview(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  鉁?
                </button>
              </div>

              <div className="p-6 grid grid-cols-2 gap-6">
                {/* 宸︿晶锛氬晢鍝佷俊鎭?*/}
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">鍟嗗搧淇℃伅</h4>
                  
                  {selectedReview.productSnapshot.images?.length > 0 && (
                    <div className="mb-4">
                      <div className="grid grid-cols-3 gap-2">
                        {selectedReview.productSnapshot.images.map((img, idx) => (
                          <img key={idx} src={img} alt="" className="w-full h-24 object-cover rounded" />
                        ))}
                      </div>
                    </div>
                  )}

                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm text-gray-500">鍟嗗搧鍚嶇О</dt>
                      <dd className="text-sm font-medium">{selectedReview.productSnapshot.name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">鎻忚堪</dt>
                      <dd className="text-sm">{selectedReview.productSnapshot.description || '鏃犳弿杩?}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">浠锋牸</dt>
                      <dd className="text-sm font-medium">楼{selectedReview.productSnapshot.price}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">鍒嗙被</dt>
                      <dd className="text-sm">{selectedReview.productSnapshot.category || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">鍟嗗搧绫诲瀷</dt>
                      <dd className="text-sm">{selectedReview.productSnapshot.productType}</dd>
                    </div>
                  </dl>
                </div>

                {/* 鍙充晶锛氬鏍镐俊鎭?*/}
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">鑷姩瀹℃牳缁撴灉</h4>
                  
                  {selectedReview.autoReviewResult ? (
                    <div className="space-y-4">
                      <div className={`p-4 rounded-lg ${
                        selectedReview.autoReviewResult.passed ? 'bg-green-50' : 'bg-yellow-50'
                      }`}>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">鑷姩璇勫垎</span>
                          <span className={`text-2xl font-bold ${
                            selectedReview.autoReviewResult.score >= 80 ? 'text-green-600' :
                            selectedReview.autoReviewResult.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {selectedReview.autoReviewResult.score}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          {selectedReview.autoReviewResult.passed ? '鉁?寤鸿閫氳繃' : '鈿狅笍 闇€浜哄伐瀹℃牳'}
                        </div>
                      </div>

                      {selectedReview.autoReviewResult.issues.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-2">鍙戠幇鐨勯棶棰?/h5>
                          <ul className="space-y-2">
                            {selectedReview.autoReviewResult.issues.map((issue, idx) => (
                              <li
                                key={idx}
                                className={`text-sm p-2 rounded ${getSeverityColor(issue.severity)}`}
                              >
                                <span className="font-medium">{issue.field}:</span> {issue.issue}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">鏃犺嚜鍔ㄥ鏍哥粨鏋?/div>
                  )}

                  {/* 瀹℃牳鎿嶄綔 */}
                  {(selectedReview.status === 'pending' || selectedReview.status === 'in_review') && (
                    <div className="mt-6 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          瀹℃牳澶囨敞
                        </label>
                        <textarea
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          className="w-full border rounded-lg p-2 text-sm"
                          rows={2}
                          placeholder="鍙€夌殑瀹℃牳澶囨敞..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          鎷掔粷鍘熷洜锛堟嫆缁濇椂蹇呭～锛?
                        </label>
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          className="w-full border rounded-lg p-2 text-sm"
                          rows={2}
                          placeholder="璇存槑鎷掔粷鐨勫師鍥?.."
                        />
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => handleReviewAction('approve')}
                          disabled={actionLoading}
                          className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          鉁?鎵瑰噯
                        </button>
                        <button
                          onClick={() => handleReviewAction('request_revision')}
                          disabled={actionLoading}
                          className="flex-1 bg-yellow-600 text-white py-2 px-4 rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                        >
                          鈫?璇锋眰淇敼
                        </button>
                        <button
                          onClick={() => handleReviewAction('reject')}
                          disabled={actionLoading}
                          className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                          鉁?鎷掔粷
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  );
}
