import { Type } from '@fastify/type-provider-typebox';
import { FragmentEntity } from '../../db/entities/Fragment';

export { Fragment, fragmentSchema, parseFragmentEntity };

type Fragment = typeof fragmentSchema.static;

const fragmentSchema = Type.Object({
  id: Type.String(),
  createdAt: Type.String(),
  updatedAt: Type.String(),
  title: Type.String(),
  duration_sec: Type.Number(),
  player_url: Type.String(),
  thumbnail_url: Type.String(),
  person: Type.Union([Type.Object({ id: Type.String(), name: Type.String() }), Type.Null()]),
  tags: Type.Union([Type.Array(Type.Object({ id: Type.String(), name: Type.String() })), Type.Null()]),
  country: Type.Union([Type.Object({ id: Type.String(), name: Type.String() }), Type.Null()]),
  narratives_ids: Type.Union([Type.Array(Type.String()), Type.Null()]),
});

function parseFragmentEntity(fragment: FragmentEntity): Fragment {
  return {
    id: fragment.id,
    createdAt: fragment.createdAt.toISOString(),
    updatedAt: fragment.updatedAt.toISOString(),
    title: fragment.title,
    duration_sec: fragment.duration_sec,
    player_url: fragment.player_url,
    thumbnail_url: fragment.thumbnail_url,
    person: fragment.person ? { id: fragment.person.id, name: fragment.person.name } : null,
    tags: fragment.tags ? fragment.tags.map(({ id, name }) => ({ id, name })) : null,
    country: fragment.person?.country ? { id: fragment.person.country.id, name: fragment.person.country.name } : null,
    narratives_ids: fragment.narrativeFragments ? fragment.narrativeFragments.map((nf) => nf.narrative.id) : null,
  };
}
