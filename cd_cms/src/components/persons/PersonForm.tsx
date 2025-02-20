import { useState, useEffect } from 'react';
import { personsApi, CreatePersonRequest, Person, PersonBio } from '../../api/persons';
import { languagesApi, Language } from '../../api/languages';
import { Input, Button, Select, Textarea, useToast, VStack, FormLabel, Flex } from '@chakra-ui/react';
import { useSaveColor } from '../../hooks/useSaveColor';

export function PersonForm({ person, onSave }: { person: Person | null; onSave: () => void }) {
  const [name, setName] = useState(person?.name || '');
  const [countryCode, setCountryCode] = useState(person?.countryCode || '');
  const [bios, setBios] = useState<PersonBio[]>(person?.bios || []);
  const [languageCode, setLanguageCode] = useState('');
  const [languages, setLanguages] = useState<Language[]>([]);
  const { saveColor, markUnsaved, markSaved } = useSaveColor();
  const toast = useToast();

  useEffect(() => {
    loadLanguages();
    if (person) {
      loadPersonBio();
    }
  }, [person]);

  const loadPersonBio = async () => {
    if (!person) return;
    try {
      if (person.bios && person.bios.length > 0) {
        setBios(person.bios);
        setLanguageCode(person.bios[0].languageCode);
      }
    } catch (error) {
      toast({
        title: 'Error loading person bio',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const loadLanguages = async () => {
    try {
      const langs = await languagesApi.getLanguages();
      setLanguages(langs);
      if (langs.length > 0 && !languageCode) {
        setLanguageCode(langs.find((lang) => lang.code === 'EN')?.code || langs[0].code);
      }
    } catch (error) {
      toast({
        title: 'Error loading languages',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleSubmit = async () => {
    try {
      if (!name) {
        toast({
          title: 'Name cannot be empty',
          status: 'error',
          duration: 3000,
        });
        return;
      }

      const existingPersonWithName = await personsApi.findPerson({ name });
      if (existingPersonWithName && existingPersonWithName.id !== person?.id) {
        toast({
          title: 'Name already exists',
          status: 'error',
          duration: 3000,
        });
        return;
      }

      const personData: CreatePersonRequest = {
        data: {
          type: 'person',
          attributes: {
            name,
            countryCode: countryCode || '',
            bios: bios,
          },
        },
      };

      if (person) {
        await personsApi.updatePerson(person.id, personData.data.attributes);
      } else {
        await personsApi.createPerson(personData.data.attributes);
      }

      toast({
        title: `Person ${person ? 'updated' : 'created'} successfully`,
        status: 'success',
        duration: 3000,
      });
      markSaved();
      // Call onSave before resetting the form
      onSave();

      // Reset form after successful submission
      setName('');
      setCountryCode('');
      setBios([]);
      if (languages.length > 0) {
        setLanguageCode(languages[0].code);
      } else {
        setLanguageCode('');
      }
    } catch (error) {
      toast({
        title: `Error ${person ? 'updating' : 'creating'} person`,
        status: 'error',
        duration: 3000,
      });
      markUnsaved();
    }
  };

  const handleCancel = () => {
    // Reset form before calling onSave
    setName('');
    setCountryCode('');
    setBios([]);
    if (languages.length > 0) {
      setLanguageCode(languages[0].code);
    } else {
      setLanguageCode('');
    }
    onSave();
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    markUnsaved();
  };

  const handleCountryCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCountryCode(e.target.value);
    markUnsaved();
  };

  const setBio = (newBio: string) => {
    if (!languageCode) return;

    const existingBioIndex = bios.findIndex((bio) => bio.languageCode === languageCode);

    if (existingBioIndex >= 0) {
      const updatedBios = [...bios];
      updatedBios[existingBioIndex] = {
        languageCode: languageCode,
        bio: newBio,
      };
      setBios(updatedBios);
    } else {
      setBios([
        ...bios,
        {
          languageCode: languageCode,
          bio: newBio,
        },
      ]);
    }
    markUnsaved();
  };

  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBio(e.target.value);
    markUnsaved();
  };

  return (
    <VStack spacing={4} align="stretch">
      <FormLabel>Name</FormLabel>
      <Input value={name || ''} onChange={handleNameChange} placeholder="Name" />

      <FormLabel>Country Code</FormLabel>
      <Input value={countryCode} onChange={handleCountryCodeChange} placeholder="Country Code" />

      <FormLabel>Language</FormLabel>
      <Select value={languageCode} onChange={(e) => setLanguageCode(e.target.value)}>
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </Select>

      <FormLabel>Bio</FormLabel>
      <Textarea
        value={bios.find((bio) => bio.languageCode === languageCode)?.bio || ''}
        onChange={handleBioChange}
        placeholder="Bio"
        minH="200px"
      />

      <Flex gap={4}>
        <Button colorScheme="teal" onClick={handleCancel}>
          Cancel
        </Button>
        <Button colorScheme={saveColor} onClick={handleSubmit} mr={3}>
          {person ? 'Update' : 'Create'}
        </Button>
      </Flex>
    </VStack>
  );
}
