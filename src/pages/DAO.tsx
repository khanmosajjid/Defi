import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StatCard from '@/components/common/StatCard';
import { 
  Vote, 
  Users, 
  Clock, 
  CheckCircle,
  XCircle,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  ArrowRight
} from 'lucide-react';

export default function DAO() {
  const [selectedProposal, setSelectedProposal] = useState<string | null>(null);

  const daoStats = {
    totalProposals: '47',
    activeProposals: '3',
    totalVoters: '2,847',
    votingPower: '15,234 vETHAN'
  };

  const proposals = [
    {
      id: '1',
      title: 'Increase Staking Rewards by 2%',
      description: 'Proposal to increase the base staking rewards from 7909% APY to 8100% APY to attract more stakers and increase protocol TVL.',
      status: 'active',
      votesFor: '1,234,567',
      votesAgainst: '234,567',
      totalVotes: '1,469,134',
      quorum: '85.2%',
      endDate: '2024-01-15',
      timeRemaining: '2 days 14h',
      proposer: '0x1234...5678',
      category: 'Protocol',
      votingPowerRequired: '1000 vETHAN'
    },
    {
      id: '2',
      title: 'Treasury Diversification Strategy',
      description: 'Allocate 20% of treasury funds to blue-chip DeFi protocols (AAVE, Compound) to reduce risk and generate additional yield for the protocol.',
      status: 'active',
      votesFor: '987,654',
      votesAgainst: '456,789',
      totalVotes: '1,444,443',
      quorum: '82.7%',
      endDate: '2024-01-18',
      timeRemaining: '5 days 8h',
      proposer: '0x2345...6789',
      category: 'Treasury',
      votingPowerRequired: '1000 vETHAN'
    },
    {
      id: '3',
      title: 'New Bond Type: ETHAN-BTC LP',
      description: 'Introduce a new bond type using ETHAN-BTC liquidity provider tokens with a 7-day vesting period and enhanced discount rates.',
      status: 'pending',
      votesFor: '0',
      votesAgainst: '0',
      totalVotes: '0',
      quorum: '0%',
      endDate: '2024-01-20',
      timeRemaining: '7 days',
      proposer: '0x3456...7890',
      category: 'Product',
      votingPowerRequired: '1000 vETHAN'
    },
    {
      id: '4',
      title: 'Reduce Bond Vesting Period',
      description: 'Reduce bond vesting period from 5 days to 3 days to improve capital efficiency and user experience.',
      status: 'passed',
      votesFor: '2,156,789',
      votesAgainst: '234,567',
      totalVotes: '2,391,356',
      quorum: '95.4%',
      endDate: '2024-01-10',
      timeRemaining: 'Ended',
      proposer: '0x4567...8901',
      category: 'Product',
      votingPowerRequired: '1000 vETHAN'
    }
  ];

  const userVotes = [
    {
      proposalId: '1',
      vote: 'for',
      power: '5,234 vETHAN',
      timestamp: '2 hours ago'
    },
    {
      proposalId: '4',
      vote: 'for',
      power: '5,234 vETHAN',
      timestamp: '5 days ago'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-600">Active</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-600">Pending</Badge>;
      case 'passed':
        return <Badge className="bg-blue-600">Passed</Badge>;
      case 'failed':
        return <Badge className="bg-red-600">Failed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Vote className="w-5 h-5 text-green-400" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      case 'passed':
        return <CheckCircle className="w-5 h-5 text-blue-400" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const calculateVotePercentage = (votes: string, total: string) => {
    const voteNum = parseFloat(votes.replace(/,/g, ''));
    const totalNum = parseFloat(total.replace(/,/g, ''));
    return totalNum > 0 ? ((voteNum / totalNum) * 100).toFixed(1) : '0';
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent mb-2">
            DAO Governance
          </h1>
          <p className="text-gray-400">
            Participate in protocol governance and shape the future of ETHAN
          </p>
        </div>

        {/* DAO Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Proposals"
            value={daoStats.totalProposals}
            change="All time"
            changeType="neutral"
            icon={<Vote className="w-5 h-5" />}
            description="Governance proposals"
          />
          <StatCard
            title="Active Proposals"
            value={daoStats.activeProposals}
            change="Currently voting"
            changeType="positive"
            icon={<Clock className="w-5 h-5" />}
            description="Open for voting"
          />
          <StatCard
            title="Total Voters"
            value={daoStats.totalVoters}
            change="Community members"
            changeType="positive"
            icon={<Users className="w-5 h-5" />}
            description="Participated in governance"
          />
          <StatCard
            title="Your Voting Power"
            value={daoStats.votingPower}
            change="Based on staked ETHAN"
            changeType="positive"
            icon={<CheckCircle className="w-5 h-5" />}
            description="Available to vote"
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Proposals List */}
          <div className="lg:col-span-2">
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/20">
              <CardHeader>
                <CardTitle className="text-yellow-400">Governance Proposals</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="active" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-gray-800">
                    <TabsTrigger value="active">Active</TabsTrigger>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="active" className="space-y-4 mt-6">
                    {proposals.filter(p => p.status === 'active').map((proposal) => (
                      <div 
                        key={proposal.id}
                        className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-yellow-500/40 transition-all cursor-pointer"
                        onClick={() => setSelectedProposal(proposal.id)}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(proposal.status)}
                            <h3 className="font-semibold text-white">{proposal.title}</h3>
                          </div>
                          {getStatusBadge(proposal.status)}
                        </div>
                        
                        <p className="text-sm text-gray-400 mb-4">{proposal.description}</p>
                        
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">For: {calculateVotePercentage(proposal.votesFor, proposal.totalVotes)}%</span>
                            <span className="text-gray-400">Against: {calculateVotePercentage(proposal.votesAgainst, proposal.totalVotes)}%</span>
                          </div>
                          <Progress 
                            value={parseFloat(calculateVotePercentage(proposal.votesFor, proposal.totalVotes))} 
                            className="h-2"
                          />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Quorum: {proposal.quorum}</span>
                            <span>Ends in: {proposal.timeRemaining}</span>
                          </div>
                        </div>
                        
                        {proposal.status === 'active' && (
                          <div className="flex space-x-2 mt-4">
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700 flex-1"
                            >
                              <ThumbsUp className="w-4 h-4 mr-1" />
                              Vote For
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="border-red-500/20 text-red-400 hover:bg-red-500/10 flex-1"
                            >
                              <ThumbsDown className="w-4 h-4 mr-1" />
                              Vote Against
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="all" className="space-y-4 mt-6">
                    {proposals.map((proposal) => (
                      <div 
                        key={proposal.id}
                        className="p-4 bg-gray-800 rounded-lg border border-gray-700"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(proposal.status)}
                            <h3 className="font-semibold text-white">{proposal.title}</h3>
                          </div>
                          {getStatusBadge(proposal.status)}
                        </div>
                        <p className="text-sm text-gray-400 mb-2">{proposal.description}</p>
                        <div className="text-xs text-gray-500">
                          Proposer: {proposal.proposer} • Category: {proposal.category}
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                  
                  <TabsContent value="history" className="space-y-4 mt-6">
                    <div className="text-center text-gray-400 py-8">
                      <Vote className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Your voting history will appear here</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Voting Info & Actions */}
          <div className="space-y-6">
            {/* Voting Power */}
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/20">
              <CardHeader>
                <CardTitle className="text-yellow-400">Your Voting Power</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-white">{daoStats.votingPower}</p>
                  <p className="text-sm text-gray-400">Available voting power</p>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Staked ETHAN:</span>
                    <span className="text-white">15,234 ETHAN</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Voting multiplier:</span>
                    <span className="text-yellow-400">1.0x</span>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/10"
                >
                  Increase Voting Power
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            {/* Create Proposal */}
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/20">
              <CardHeader>
                <CardTitle className="text-yellow-400">Create Proposal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-400">
                  Have an idea to improve the protocol? Create a governance proposal.
                </p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Min. voting power:</span>
                    <span className="text-white">1,000 vETHAN</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Your power:</span>
                    <span className="text-green-400">15,234 vETHAN ✓</span>
                  </div>
                </div>
                
                <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-black">
                  Create Proposal
                </Button>
              </CardContent>
            </Card>

            {/* Recent Votes */}
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/20">
              <CardHeader>
                <CardTitle className="text-yellow-400">Your Recent Votes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {userVotes.map((vote, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-2">
                      {vote.vote === 'for' ? (
                        <ThumbsUp className="w-4 h-4 text-green-400" />
                      ) : (
                        <ThumbsDown className="w-4 h-4 text-red-400" />
                      )}
                      <div>
                        <p className="text-sm font-medium">Proposal #{vote.proposalId}</p>
                        <p className="text-xs text-gray-400">{vote.timestamp}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{vote.power}</p>
                      <p className={`text-xs ${vote.vote === 'for' ? 'text-green-400' : 'text-red-400'}`}>
                        {vote.vote === 'for' ? 'For' : 'Against'}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}