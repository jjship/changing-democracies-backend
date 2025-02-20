import { Type, TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { FastifyInstance, FastifyRequest } from 'fastify';
import { DataSource } from 'typeorm';
import { PersonEntity } from '../../db/entities/Person';
import { BioEntity } from '../../db/entities/Bio';
import { FragmentEntity } from '../../db/entities/Fragment';
import { NotFoundError } from '../../errors';

interface DeletePersonParams {
  Params: {
    id: string;
  };
}

export const registerDeletePersonController =
  (app: FastifyInstance) =>
  ({ dbConnection }: { dbConnection: DataSource }) => {
    app.withTypeProvider<TypeBoxTypeProvider>().route({
      method: 'DELETE',
      url: '/persons/:id',
      schema: {
        params: Type.Object({
          id: Type.String(),
        }),
        response: {
          204: Type.Null(),
        },
      },
      handler: async (req: FastifyRequest<DeletePersonParams>, res) => {
        const personRepository = dbConnection.getRepository(PersonEntity);
        const bioRepository = dbConnection.getRepository(BioEntity);
        const bios = await bioRepository.find({ where: { person: { id: req.params.id } } });

        if (bios.length > 0) {
          await bioRepository.remove(bios);
        }

        const fragmentRepository = dbConnection.getRepository(FragmentEntity);
        const fragments = await fragmentRepository.find({ where: { person: { id: req.params.id } } });

        if (fragments.length > 0) {
          for (const fragment of fragments) {
            fragment.person = null;
            await fragmentRepository.save(fragment);
          }
        }

        const person = await personRepository.findOne({ where: { id: req.params.id } });

        if (!person) {
          return res.status(204).send();
        }

        await personRepository.remove(person);

        return res.status(204).send();
      },
    });
  };
