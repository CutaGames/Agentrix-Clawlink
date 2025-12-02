import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class FixAgentSessionUserIdNullable1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 修改 userId 字段允许 null
    await queryRunner.changeColumn(
      'agent_sessions',
      'userId',
      new TableColumn({
        name: 'userId',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 回滚：不允许 null
    await queryRunner.changeColumn(
      'agent_sessions',
      'userId',
      new TableColumn({
        name: 'userId',
        type: 'varchar',
        isNullable: false,
      }),
    );
  }
}

