import { useForm, useFieldArray, SubmitHandler, Control } from 'react-hook-form';
import { FC, KeyboardEvent, useEffect, useRef, useState } from 'react';
import Keyboard, { KeyboardReactInterface } from 'react-simple-keyboard';
import { v4 as uuidv4 } from 'uuid';
import 'react-simple-keyboard/build/css/index.css';
import { useBoothContext } from './BoothContext';
import { useLayout } from './useLayout';
import { useTranslations } from './useTranslations';
import { Form, FormControl, FormField, FormItem } from './ui/form';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { BackBtn } from './BackBtn';
import { LayoutType } from './keyboardLayouts';
import { CSSPropertiesWithVars, boothBtn } from './boothConstants';

type StatementsFormValues = {
  inputStatements: { id: string; text: string }[];
};

const thisStage = 5;

export const StatementsForm: FC = () => {
  const { statements, setStatements, stage, setStage, windowHeight } = useBoothContext();
  const { writeStatement, next } = useTranslations();
  const [layoutType, setLayoutType] = useState<LayoutType>('default');
  const [focusedIdx, setFocusedIdx] = useState<number>(0);
  const { layout, handleLayoutTypeChange, isLayoutKey } = useLayout(setLayoutType);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const keyboardRef = useRef<KeyboardReactInterface | null>(null);

  const form = useForm<StatementsFormValues>({
    defaultValues: {
      inputStatements: statements?.map((text) => ({ id: uuidv4(), text })) ?? [
        { id: uuidv4(), text: '' },
      ],
    },
  });

  useEffect(() => {
    if (stage !== thisStage) {
      form.reset({ inputStatements: [{ id: uuidv4(), text: '' }] });
    }
  }, [stage, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control as Control<StatementsFormValues>,
    name: 'inputStatements',
  });

  const onSubmit: SubmitHandler<StatementsFormValues> = (values) => {
    setStatements(values.inputStatements.map((statement) => statement.text));
    setStage(thisStage + 1);
    setFocusedIdx(0);
    setLayoutType('default');
    form.reset({ inputStatements: [{ id: uuidv4(), text: '' }] });
  };

  const handleKeyPress = (
    event: KeyboardEvent<HTMLInputElement> | { key: string },
    index: number,
  ) => {
    const isPhysicalEvent = 'preventDefault' in event;
    const { key } = event;
    const isEnter = (k: string) => k === 'Enter' || k === '{enter}';
    const isBskp = (k: string) => k === 'Backspace' || k === '{bksp}';

    if (isEnter(key)) {
      if (isPhysicalEvent) event.preventDefault();
      append(
        { id: `id-${fields.length}`, text: '' },
        { shouldFocus: true, focusIndex: fields.length + 1 },
      );
      setFocusedIdx((prev) => prev + 1);
      setTimeout(() => {
        keyboardRef.current?.setInput('');
      }, 0);
      return;
    }
    if (isBskp(key) && !form.getValues(`inputStatements.${index}.text`)) {
      if (isPhysicalEvent) event.preventDefault();
      if (fields.length > 1) {
        remove(index);
        const indexToFocus = index === 0 ? 0 : index - 1;
        setFocusedIdx(indexToFocus);
        setTimeout(() => {
          keyboardRef.current?.setInput(fields[indexToFocus].text);
          inputRefs.current[indexToFocus]?.focus();
        }, 0);
      }
      return;
    }
    if (isLayoutKey(key)) {
      handleLayoutTypeChange(key);
      return;
    }
  };

  const handleVirtualKeyPress = (key: string) => {
    handleKeyPress({ key }, focusedIdx);
  };

  const handleChange = (input: string, index: number) => {
    const currentValues = form.getValues('inputStatements');
    if (currentValues.length) {
      const updatedValues = [...currentValues];
      updatedValues[index] = { ...updatedValues[index], text: input };
      form.setValue('inputStatements', updatedValues);
      setStatements(updatedValues.map((s) => s.text));
    }
  };

  const handleVirtualChange = (input: string) => {
    handleChange(input, focusedIdx);
  };

  if (stage !== thisStage) return null;

  const btnY = windowHeight / 6;
  const buttonStyle: CSSPropertiesWithVars = {
    width: '200px',
    height: '50px',
    '--start-y': '100vh',
    '--end-y': `${btnY}px`,
  };

  return (
    <div className="flex h-screen w-2/3 flex-col content-center items-stretch justify-between">
      <p className="mt-24 text-center text-4xl">{writeStatement}</p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex w-full flex-col items-center">
            {fields.map((field, index) => (
              <FormField
                key={field.id}
                control={form.control}
                name={`inputStatements.${index}.text`}
                render={({ field: { onChange, onBlur, value, name, ref } }) => (
                  <FormItem className="w-full">
                    <FormControl>
                      <Input
                        ref={(el) => {
                          inputRefs.current[index] = el;
                          ref(el);
                        }}
                        className="mb-5 w-full bg-darkRed px-10 py-6 text-3xl text-black_bg"
                        onKeyDown={(e) => handleKeyPress(e, index)}
                        onChange={(e) => onChange(e.target.value)}
                        onBlur={onBlur}
                        value={value}
                        name={name}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            ))}
            <Button type="submit" className={`${boothBtn} animate-slideUp`} style={buttonStyle}>
              {next}
            </Button>
          </div>
        </form>
      </Form>
      <div className="w-full pt-10 text-black_bg">
        <Keyboard
          keyboardRef={(r) => (keyboardRef.current = r)}
          onChange={handleVirtualChange}
          onKeyPress={handleVirtualKeyPress}
          inputName="statements"
          layout={layout}
          layoutName={layoutType}
          theme="hg-theme-default myTheme1"
        />
      </div>
      <BackBtn />
    </div>
  );
};
