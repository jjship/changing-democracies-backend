import { supabase } from '../lib/supabase';

export interface TagName {
  languageCode: string;
  name: string;
}

export interface Tag {
  id: string;
  names: TagName[];
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export const tagsApi = {
  async create(names: TagName[]): Promise<Tag> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const response = await fetch(`${BACKEND_URL}/tags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ names }),
    });

    if (!response.ok) throw new Error('Failed to create tag');
    return response.json();
  },

  async update(id: string, names: TagName[]): Promise<Tag> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const response = await fetch(`${BACKEND_URL}/tags/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ names }),
    });

    if (!response.ok) throw new Error('Failed to update tag');
    return response.json();
  },

  async delete(id: string): Promise<void> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const response = await fetch(`${BACKEND_URL}/tags/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
      },
    });

    if (!response.ok) throw new Error('Failed to delete tag');
  },

  async get(): Promise<Tag[]> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const response = await fetch(`${BACKEND_URL}/tags`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
      },
    });

    if (!response.ok) throw new Error('Failed to fetch tags');
    return response.json();
  },
};
