import { FC, useState } from 'react';
import { useForm } from 'react-hook-form';
import Keyboard from 'react-simple-keyboard';
import 'react-simple-keyboard/build/css/index.css';
import { useBoothContext } from './BoothContext';
import { useLayout, LayoutKey } from './useLayout';
import { useTranslations } from './useTranslations';
import { Form, FormControl, FormField, FormItem } from './ui/form';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { BackBtn } from './BackBtn';
import { LayoutType } from './keyboardLayouts';
import { CSSPropertiesWithVars, boothBtn } from './boothConstants';

const thisStage = 4;

export const NameForm: FC = () => {
  const { userName, setUserName, stage, setStage, windowHeight } = useBoothContext();
  const { next, whatName } = useTranslations();
  const [layoutType, setLayoutType] = useState<LayoutType>('default');
  const { layout, handleLayoutTypeChange, isLayoutKey } = useLayout(setLayoutType);

  const form = useForm<{ userName: string }>({
    defaultValues: { userName: userName ?? '' },
  });

  const onSubmit = (values: { userName: string }) => {
    const userNameInput = values.userName;
    values.userName = '';
    setUserName(userNameInput);
    setStage(thisStage + 1);
    setLayoutType('default');
    form.reset({ userName: '' });
  };

  const handleChange = (input: string) => {
    setUserName(input);
    form.setValue('userName', input);
  };

  const handleVirtualKeyPress = (key: string) => {
    if (isLayoutKey(key)) handleLayoutTypeChange(key as LayoutKey);
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
      <p className="mt-24 text-center text-4xl">{whatName}</p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex w-full flex-col items-center">
            <FormField
              control={form.control}
              name="userName"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormControl>
                    <Input
                      className="w-full border-0 bg-darkRed px-10 py-6 text-3xl text-black_bg"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button type="submit" className={`${boothBtn} animate-slideUp`} style={buttonStyle}>
              {next}
            </Button>
          </div>
        </form>
      </Form>
      <div className="w-full pt-10 text-black_bg">
        <Keyboard
          onChange={handleChange}
          inputName="userName"
          layout={layout}
          layoutName={layoutType}
          theme="hg-theme-default myTheme1"
          onKeyPress={handleVirtualKeyPress}
        />
      </div>
      <BackBtn />
    </div>
  );
};
