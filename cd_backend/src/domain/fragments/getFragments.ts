import { FastifyBaseLogger } from 'fastify';
import { DataSource } from 'typeorm';
import { FragmentEntity } from '../../db/entities/Fragment';

const getFragments = async ({ dbConnection }: { dbConnection: DataSource; logger: FastifyBaseLogger }) => {
  return await dbConnection.getRepository(FragmentEntity).find();
};
