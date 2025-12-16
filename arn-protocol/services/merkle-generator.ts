/**
 * ARN Merkle Tree Generator
 * 
 * 负责生成和管理 Merkle 树用于奖励分发
 */

import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import * as fs from 'fs';
import * as path from 'path';

interface RewardEntry {
  address: string;
  amount: string; // 字符串以保持精度
  role?: string;
}

interface MerkleTreeData {
  epochId: number;
  token: string;
  root: string;
  totalAmount: string;
  entries: RewardEntry[];
  generatedAt: string;
}

class MerkleTreeGenerator {
  private dataDir: string;

  constructor(dataDir: string = './data/merkle-trees') {
    this.dataDir = dataDir;
    this.ensureDataDir();
  }

  private ensureDataDir(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * 从奖励列表生成 Merkle 树
   */
  generate(entries: RewardEntry[]): {
    root: string;
    tree: any;
    proofs: Map<string, string[]>;
  } {
    if (entries.length === 0) {
      throw new Error('Cannot generate Merkle tree with no entries');
    }

    // 格式化叶子节点: [address, amount]
    const leaves = entries.map(e => [e.address.toLowerCase(), e.amount]);

    // 创建 Merkle 树
    const tree = StandardMerkleTree.of(leaves, ['address', 'uint256']);

    // 生成所有证明
    const proofs = new Map<string, string[]>();
    for (const [i, v] of tree.entries()) {
      proofs.set(v[0].toLowerCase(), tree.getProof(i));
    }

    return {
      root: tree.root,
      tree,
      proofs,
    };
  }

  /**
   * 保存 Merkle 树数据到文件
   */
  save(epochId: number, token: string, entries: RewardEntry[], root: string): string {
    const totalAmount = entries.reduce(
      (sum, e) => sum + BigInt(e.amount),
      0n
    ).toString();

    const data: MerkleTreeData = {
      epochId,
      token,
      root,
      totalAmount,
      entries,
      generatedAt: new Date().toISOString(),
    };

    const filename = `epoch-${epochId}-${token.slice(0, 8)}.json`;
    const filepath = path.join(this.dataDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`Merkle tree saved to: ${filepath}`);

    return filepath;
  }

  /**
   * 加载 Merkle 树数据
   */
  load(epochId: number, token: string): MerkleTreeData | null {
    const filename = `epoch-${epochId}-${token.slice(0, 8)}.json`;
    const filepath = path.join(this.dataDir, filename);

    if (!fs.existsSync(filepath)) {
      return null;
    }

    const content = fs.readFileSync(filepath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * 获取用户的证明
   */
  getProof(epochId: number, token: string, address: string): {
    amount: string;
    proof: string[];
  } | null {
    const data = this.load(epochId, token);
    if (!data) {
      return null;
    }

    // 重建树以获取证明
    const leaves = data.entries.map(e => [e.address.toLowerCase(), e.amount]);
    const tree = StandardMerkleTree.of(leaves, ['address', 'uint256']);

    for (const [i, v] of tree.entries()) {
      if (v[0].toLowerCase() === address.toLowerCase()) {
        return {
          amount: v[1],
          proof: tree.getProof(i),
        };
      }
    }

    return null;
  }

  /**
   * 验证证明
   */
  verify(
    root: string,
    address: string,
    amount: string,
    proof: string[]
  ): boolean {
    try {
      return StandardMerkleTree.verify(
        root,
        ['address', 'uint256'],
        [address.toLowerCase(), amount],
        proof
      );
    } catch {
      return false;
    }
  }

  /**
   * 列出所有已生成的 Merkle 树
   */
  list(): MerkleTreeData[] {
    const files = fs.readdirSync(this.dataDir).filter(f => f.endsWith('.json'));
    return files.map(f => {
      const content = fs.readFileSync(path.join(this.dataDir, f), 'utf-8');
      return JSON.parse(content);
    });
  }
}

// CLI 入口
async function main() {
  const generator = new MerkleTreeGenerator();
  const command = process.argv[2] || 'list';

  switch (command) {
    case 'generate':
      // 示例生成
      const entries: RewardEntry[] = [
        { address: '0x1234567890123456789012345678901234567890', amount: '1000000000000000000', role: 'agent' },
        { address: '0x2345678901234567890123456789012345678901', amount: '500000000000000000', role: 'agent' },
      ];
      const { root, proofs } = generator.generate(entries);
      console.log('Generated Merkle Root:', root);
      console.log('Proofs:', Object.fromEntries(proofs));
      break;

    case 'list':
      const trees = generator.list();
      console.log('Saved Merkle Trees:');
      trees.forEach(t => {
        console.log(`  Epoch ${t.epochId}: ${t.root} (${t.entries.length} entries)`);
      });
      break;

    case 'proof':
      const epochId = parseInt(process.argv[3]);
      const token = process.argv[4];
      const address = process.argv[5];
      
      if (!epochId || !token || !address) {
        console.log('Usage: ts-node merkle-generator.ts proof <epochId> <token> <address>');
        break;
      }
      
      const proofData = generator.getProof(epochId, token, address);
      if (proofData) {
        console.log('Proof:', JSON.stringify(proofData, null, 2));
      } else {
        console.log('No proof found');
      }
      break;

    default:
      console.log('Usage: ts-node merkle-generator.ts [generate|list|proof]');
  }
}

main().catch(console.error);

export { MerkleTreeGenerator, RewardEntry, MerkleTreeData };
