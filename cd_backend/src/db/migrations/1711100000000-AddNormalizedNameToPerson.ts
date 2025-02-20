import { MigrationInterface, QueryRunner, TableColumn, In } from 'typeorm';
import { normalizeName } from '../../utils/normalizeName'; // Ensure this path is correct
import { PersonEntity } from '../entities/Person';
import { FragmentEntity } from '../entities/Fragment';

export class AddNormalizedNameToPerson1711100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'person_entity',
      new TableColumn({
        name: 'normalizedName',
        type: 'varchar',
        isUnique: false,
        isNullable: true, // Temporarily allow nulls for existing records
      })
    );

    // Populate normalizedName for existing records
    const persons = await queryRunner.query(`SELECT id, name FROM person_entity`);
    for (const person of persons) {
      let normalizedName = normalizeName(person.name);
      if (person.name === 'Joanna Piekarska-Miłosz') {
        normalizedName = normalizeName('Joanna Miłosz-Piekarska');
      }
      await queryRunner.query(`UPDATE person_entity SET "normalizedName" = $1 WHERE id = $2`, [
        normalizedName,
        person.id,
      ]);
    }

    // Merge duplicates
    await queryRunner.manager.transaction(async (entityManager) => {
      const duplicates = await entityManager
        .createQueryBuilder(PersonEntity, 'person')
        .select('normalizedName')
        .addSelect('COUNT(*)', 'count')
        .groupBy('normalizedName')
        .having('COUNT(*) > 1')
        .getRawMany();

      for (const duplicate of duplicates) {
        const persons = await entityManager.find(PersonEntity, {
          where: { normalizedName: duplicate.normalizedName },
          relations: ['fragments'],
        });

        if (persons.length > 1) {
          const [primaryPerson, ...otherPersons] = persons;

          for (const person of otherPersons) {
            if (person.fragments?.length) {
              await entityManager.update(FragmentEntity, { person: { id: person.id } }, { person: primaryPerson });
            }
            await entityManager.remove(person);
          }
        }
      }
    });

    // Make the column unique and non-nullable after merging duplicates
    await queryRunner.changeColumn(
      'person_entity',
      'normalizedName',
      new TableColumn({
        name: 'normalizedName',
        type: 'varchar',
        isUnique: true,
        isNullable: false,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('person_entity', 'normalizedName');
  }
}
