import { cdApiRequest } from './cdApi';

export interface TagName {
  languageCode: string;
  name: string;
}

export interface Tag {
  id: string;
  names: TagName[];
}

export async function createTag(names: TagName[]): Promise<Tag> {
  return cdApiRequest<Tag>({
    endpoint: '/tags',
    options: {
      method: 'POST',
      body: JSON.stringify({ names }),
    },
  });
}

export async function updateTag(id: string, names: TagName[]): Promise<Tag> {
  return cdApiRequest<Tag>({
    endpoint: `/tags/${id}`,
    options: {
      method: 'PUT',
      body: JSON.stringify({ names }),
    },
  });
}

export async function deleteTag(id: string): Promise<void> {
  await cdApiRequest<void>({
    endpoint: `/tags/${id}`,
    options: {
      method: 'DELETE',
    },
  });
}

export async function getTags(): Promise<Tag[]> {
  return cdApiRequest<Tag[]>({
    endpoint: '/tags',
    options: {
      method: 'GET',
    },
  });
}
