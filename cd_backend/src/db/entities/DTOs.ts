// import { BioEntity } from './Bio';
// import { CountryEntity } from './Country';
// import { FragmentEntity } from './Fragment';
// import { PersonEntity } from './Person';
// import { TagEntity } from './Tag';

// class FragmentDTO {
//   id: string;
//   title?: string;
//   duration_sec?: number;
//   player_url?: string;
//   thumbnail_url?: string;
//   person?: PersonDTO;
//   tags?: TagDTO[];
// }

// class PersonDTO {
//   person_id?: string;
//   name?: string;
//   country?: CountryDTO;
//   bios!: BioDTO[];
// }

// class CountryDTO {
//   country_id?: string;
//   name?: string;
// }

// class BioDTO {
//   bio_id?: string;
//   bio?: string;
//   language_code?: string;
// }

// class TagDTO {
//   tag_id?: string;
//   name?: string;
// }

// function toFragmentDTO(fragment: FragmentEntity): FragmentDTO {
//   return {
//     fragment_id: fragment.fragment_id,
//     title: fragment.title,
//     duration_sec: fragment.duration_sec,
//     player_url: fragment.player_url,
//     thumbnail_url: fragment.thumbnail_url,
//     person: toPersonDTO(fragment.person),
//     tags: fragment.tags.map(toTagDTO),
//   };
// }

// function toPersonDTO(person: PersonEntity): PersonDTO {
//   return {
//     person_id: person.person_id,
//     name: person.name,
//     country: toCountryDTO(person.country),
//     bios: person.bios.map(toBioDTO),
//   };
// }

// function toCountryDTO(country: CountryEntity): CountryDTO {
//   return {
//     country_id: country.country_id,
//     name: country.name,
//   };
// }

// function toBioDTO(bio: BioEntity): BioDTO {
//   return {
//     bio_id: bio.bio_id,
//     bio: bio.bio,
//     language_code: bio.language_code,
//   };
// }

// function toTagDTO(tag: TagEntity): TagDTO {
//   return {
//     tag_id: tag.tag_id,
//     name: tag.name,
//   };
// }
