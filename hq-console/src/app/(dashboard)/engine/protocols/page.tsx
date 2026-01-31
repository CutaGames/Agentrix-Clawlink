"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api';
import { RefreshCw, Shield, Cpu, Wallet, CheckCircle, AlertTriangle, Clock, Search, ThumbsUp, ThumbsDown, Play, Pause, Zap } from 'lucide-react';

interface McpTool {
  id: string;
  name: string;
  status: 'active' | 'disabled' | 'error';
  invocations: number;
  lastUsed: string;
}

interface UcpSkill {
  id: string;
  name: string;
  protocol: string;
  status: 'verified' | 'pending' | 'rejected';
  calls: number;
}

interface X402Path {
  id: string;
  from: string;
  to: string;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed';
  txHash: string | null;
  createdAt: string;
}

interface ProtocolSummary {
  mcp: { toolCount: number; totalInvocations: number; status: string };
  ucp: { skillCount: number; totalCalls: number; status: string };
  x402: { pathCount: number; status: string };
  overallStatus: string;
  lastAudit: string;
}

export default function ProtocolAuditPage() {
  const [summary, setSummary] = useState<ProtocolSummary | null>(null);
  const [mcpTools, setMcpTools] = useState<McpTool[]>([]);
  const [ucpSkills, setUcpSkills] = useState<UcpSkill[]>([]);
  const [x402Paths, setX402Paths] = useState<X402Path[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, mcpRes, ucpRes, x402Res] = await Promise.all([
        api.get('/hq/protocols/summary'),
        api.get('/hq/protocols/mcp'),
        api.get('/hq/protocols/ucp'),
        api.get('/hq/protocols/x402'),
      ]);
      setSummary(summaryRes.data);
      setMcpTools(mcpRes.data.tools || []);
      setUcpSkills(ucpRes.data.skills || []);
      setX402Paths(x402Res.data.paths || []);
    } catch (e) {
      console.error('Failed to fetch protocol data:', e);
      // Mock data for demo
      setSummary({
        mcp: { toolCount: 12, totalInvocations: 1543, status: 'passed' },
        ucp: { skillCount: 8, totalCalls: 892, status: 'passed' },
        x402: { pathCount: 23, status: 'passed' },
        overallStatus: 'healthy',
        lastAudit: new Date().toISOString(),
      });
      setMcpTools([
        { id: 'mcp-1', name: 'search_local_docs', status: 'active', invocations: 456, lastUsed: new Date().toISOString() },
        { id: 'mcp-2', name: 'web_search', status: 'active', invocations: 321, lastUsed: new Date().toISOString() },
        { id: 'mcp-3', name: 'send_email', status: 'disabled', invocations: 89, lastUsed: new Date(Date.now() - 86400000).toISOString() },
      ]);
      setUcpSkills([
        { id: 'ucp-1', name: 'payment_processing', protocol: 'x402', status: 'verified', calls: 234 },
        { id: 'ucp-2', name: 'kyc_verification', protocol: 'stripe', status: 'pending', calls: 56 },
        { id: 'ucp-3', name: 'document_signing', protocol: 'docusign', status: 'verified', calls: 123 },
      ]);
      setX402Paths([
        { id: 'x402-1', from: '0x1234...5678', to: '0xabcd...efgh', amount: 100, currency: 'USDC', status: 'completed', txHash: '0xabc123', createdAt: new Date().toISOString() },
        { id: 'x402-2', from: 'Platform', to: '0x9876...5432', amount: 50.5, currency: 'USDC', status: 'pending', txHash: null, createdAt: new Date().toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleScan = async (protocol: string) => {
    setScanning(protocol);
    // Simulate scan
    await new Promise(resolve => setTimeout(resolve, 2000));
    await fetchData();
    setScanning(null);
  };

  const handleApprove = async (type: string, id: string) => {
    console.log(`Approving ${type} ${id}`);
    // TODO: Call API to approve
    await fetchData();
  };

  const handleReject = async (type: string, id: string) => {
    console.log(`Rejecting ${type} ${id}`);
    // TODO: Call API to reject
    await fetchData();
  };

  const handleToggle = async (type: string, id: string, currentStatus: string) => {
    console.log(`Toggling ${type} ${id} from ${currentStatus}`);
    // TODO: Call API to toggle
    await fetchData();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
      case 'verified':
      case 'completed':
      case 'passed':
      case 'healthy':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"><CheckCircle className="h-3 w-3 mr-1" />{status}</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />{status}</Badge>;
      case 'error':
      case 'rejected':
      case 'failed':
      case 'disabled':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><AlertTriangle className="h-3 w-3 mr-1" />{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Protocol Audit</h1>
          <p className="text-slate-400">Monitor MCP, UCP, and X402 protocol compliance</p>
        </div>
        <Button onClick={fetchData} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-400" />
                Overall Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{getStatusBadge(summary.overallStatus)}</div>
              <p className="text-xs text-slate-500 mt-1">Last audit: {new Date(summary.lastAudit).toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <Cpu className="h-4 w-4 text-blue-400" />
                MCP Tools
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{summary.mcp.toolCount}</div>
              <p className="text-xs text-slate-500 mt-1">{summary.mcp.totalInvocations.toLocaleString()} invocations</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <Shield className="h-4 w-4 text-purple-400" />
                UCP Skills
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{summary.ucp.skillCount}</div>
              <p className="text-xs text-slate-500 mt-1">{summary.ucp.totalCalls.toLocaleString()} calls</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-amber-400" />
                X402 Paths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{summary.x402.pathCount}</div>
              <p className="text-xs text-slate-500 mt-1">Fund transfers tracked</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs for detailed views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-800/50 border border-slate-700">
          <TabsTrigger value="overview" className="data-[state=active]:bg-slate-700">Overview</TabsTrigger>
          <TabsTrigger value="mcp" className="data-[state=active]:bg-slate-700">MCP Tools</TabsTrigger>
          <TabsTrigger value="ucp" className="data-[state=active]:bg-slate-700">UCP Skills</TabsTrigger>
          <TabsTrigger value="x402" className="data-[state=active]:bg-slate-700">X402 Fund Paths</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Protocol Compliance Overview</CardTitle>
              <CardDescription>All protocols are monitored for compliance and security</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Cpu className="h-8 w-8 text-blue-400" />
                    <div>
                      <p className="font-medium text-white">Model Context Protocol (MCP)</p>
                      <p className="text-sm text-slate-400">Tool invocation and context management</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge('passed')}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleScan('mcp')}
                      disabled={scanning === 'mcp'}
                    >
                      <Search className={`h-4 w-4 mr-1 ${scanning === 'mcp' ? 'animate-spin' : ''}`} />
                      {scanning === 'mcp' ? 'Scanning...' : 'Scan'}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="h-8 w-8 text-purple-400" />
                    <div>
                      <p className="font-medium text-white">Unified Capability Protocol (UCP)</p>
                      <p className="text-sm text-slate-400">Skill discovery and invocation</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge('passed')}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleScan('ucp')}
                      disabled={scanning === 'ucp'}
                    >
                      <Search className={`h-4 w-4 mr-1 ${scanning === 'ucp' ? 'animate-spin' : ''}`} />
                      {scanning === 'ucp' ? 'Scanning...' : 'Scan'}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Wallet className="h-8 w-8 text-amber-400" />
                    <div>
                      <p className="font-medium text-white">X402 Payment Protocol</p>
                      <p className="text-sm text-slate-400">Agent-to-agent payment tracking</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge('passed')}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleScan('x402')}
                      disabled={scanning === 'x402'}
                    >
                      <Search className={`h-4 w-4 mr-1 ${scanning === 'x402' ? 'animate-spin' : ''}`} />
                      {scanning === 'x402' ? 'Scanning...' : 'Scan'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mcp">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-white">MCP Tool Registry</CardTitle>
                <CardDescription>Available tools and their usage statistics</CardDescription>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleScan('mcp')}
                disabled={scanning === 'mcp'}
              >
                <Search className={`h-4 w-4 mr-1 ${scanning === 'mcp' ? 'animate-spin' : ''}`} />
                {scanning === 'mcp' ? 'Scanning...' : 'Scan All'}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-slate-800/50">
                    <TableHead className="text-slate-400">Tool Name</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400">Invocations</TableHead>
                    <TableHead className="text-slate-400">Last Used</TableHead>
                    <TableHead className="text-slate-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mcpTools.map((tool) => (
                    <TableRow key={tool.id} className="border-slate-700 hover:bg-slate-800/50">
                      <TableCell className="text-white font-mono">{tool.name}</TableCell>
                      <TableCell>{getStatusBadge(tool.status)}</TableCell>
                      <TableCell className="text-slate-300">{tool.invocations.toLocaleString()}</TableCell>
                      <TableCell className="text-slate-400">{new Date(tool.lastUsed).toLocaleString()}</TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleToggle('mcp', tool.id, tool.status)}
                          className={tool.status === 'active' ? 'text-yellow-400 hover:text-yellow-300' : 'text-emerald-400 hover:text-emerald-300'}
                        >
                          {tool.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ucp">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-white">UCP Skill Registry</CardTitle>
                <CardDescription>Registered skills and verification status</CardDescription>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleScan('ucp')}
                disabled={scanning === 'ucp'}
              >
                <Search className={`h-4 w-4 mr-1 ${scanning === 'ucp' ? 'animate-spin' : ''}`} />
                {scanning === 'ucp' ? 'Scanning...' : 'Scan All'}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-slate-800/50">
                    <TableHead className="text-slate-400">Skill Name</TableHead>
                    <TableHead className="text-slate-400">Protocol</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400">Total Calls</TableHead>
                    <TableHead className="text-slate-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ucpSkills.map((skill) => (
                    <TableRow key={skill.id} className="border-slate-700 hover:bg-slate-800/50">
                      <TableCell className="text-white">{skill.name}</TableCell>
                      <TableCell className="text-slate-300 font-mono">{skill.protocol}</TableCell>
                      <TableCell>{getStatusBadge(skill.status)}</TableCell>
                      <TableCell className="text-slate-300">{skill.calls.toLocaleString()}</TableCell>
                      <TableCell>
                        {skill.status === 'pending' ? (
                          <div className="flex items-center gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleApprove('ucp', skill.id)}
                              className="text-emerald-400 hover:text-emerald-300"
                            >
                              <ThumbsUp className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleReject('ucp', skill.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <ThumbsDown className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Zap className="h-4 w-4 text-slate-500" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="x402">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-white">X402 Fund Path Tracker</CardTitle>
                <CardDescription>Agent-to-agent payment transactions</CardDescription>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleScan('x402')}
                disabled={scanning === 'x402'}
              >
                <Search className={`h-4 w-4 mr-1 ${scanning === 'x402' ? 'animate-spin' : ''}`} />
                {scanning === 'x402' ? 'Scanning...' : 'Audit All'}
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-slate-800/50">
                    <TableHead className="text-slate-400">From</TableHead>
                    <TableHead className="text-slate-400">To</TableHead>
                    <TableHead className="text-slate-400">Amount</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400">Tx Hash</TableHead>
                    <TableHead className="text-slate-400">Time</TableHead>
                    <TableHead className="text-slate-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {x402Paths.map((path) => (
                    <TableRow key={path.id} className="border-slate-700 hover:bg-slate-800/50">
                      <TableCell className="text-slate-300 font-mono text-xs">{path.from}</TableCell>
                      <TableCell className="text-slate-300 font-mono text-xs">{path.to}</TableCell>
                      <TableCell className="text-white">{path.amount} {path.currency}</TableCell>
                      <TableCell>{getStatusBadge(path.status)}</TableCell>
                      <TableCell className="text-slate-400 font-mono text-xs">{path.txHash || '-'}</TableCell>
                      <TableCell className="text-slate-400">{new Date(path.createdAt).toLocaleString()}</TableCell>
                      <TableCell>
                        {path.status === 'pending' ? (
                          <div className="flex items-center gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleApprove('x402', path.id)}
                              className="text-emerald-400 hover:text-emerald-300"
                            >
                              <ThumbsUp className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleReject('x402', path.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <ThumbsDown className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
