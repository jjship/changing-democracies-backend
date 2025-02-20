import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class MakePersonNullableInFragment1711000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumn(
      'fragment_entity',
      'personId',
      new TableColumn({
        name: 'personId',
        type: 'uuid',
        isNullable: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumn(
      'fragment_entity',
      'personId',
      new TableColumn({
        name: 'personId',
        type: 'uuid',
        isNullable: false,
      })
    );
  }
}
