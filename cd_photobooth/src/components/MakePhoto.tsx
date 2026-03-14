import { useRef, useEffect, useCallback, useState, FC } from 'react';
import Webcam from 'react-webcam';
import { v4 as uuidv4 } from 'uuid';
import { photoboothApi } from '../api/photobooth-api';
import { Button } from './ui/button';
import { BackBtn } from './BackBtn';
import { CountDown } from './CountDown';
import { useBoothContext } from './BoothContext';
import { useTranslations } from './useTranslations';
import { boothBtn } from './boothConstants';

const thisStage = 6;

const canvasWidth = 607;
const canvasHeight = 1080;
export const canvasRatio = canvasWidth / canvasHeight;

export const MakePhoto: FC = () => {
  const [countdown, setStart] = useState(false);
  const [countdownCompleted, setCountdownCompleted] = useState(false);
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { take } = useTranslations();
  const { statements, stage, setStage, userName, location, setFilename, fontFamily } =
    useBoothContext();

  const drawTriangle = useCallback(
    ({ ctx, endX, startY }: { ctx: CanvasRenderingContext2D; endX: number; startY: number }) => {
      const yellowBrown = '#cf9855';
      const r = 35;
      const a1 = Math.PI;
      const a2 = a1 + (Math.PI * 2) / 3;
      const a3 = a2 + (Math.PI * 2) / 3;

      ctx.fillStyle = yellowBrown;

      const x1 = endX - r / 2 + Math.cos(a1) * r;
      const y1 = startY + Math.sin(a1) * r;
      const x2 = endX - r / 2 + Math.cos(a2) * r;
      const y2 = startY + Math.sin(a2) * r;
      const x3 = endX - r / 2 + Math.cos(a3) * r;
      const y3 = startY + Math.sin(a3) * r;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x3, y3);
      ctx.closePath();
      ctx.fill();
    },
    [],
  );

  const drawStatements = useCallback(
    (ctx: CanvasRenderingContext2D, stmts: string[] | null, fontSize: number) => {
      stmts?.forEach((statement, idx) => {
        if (!statement) return;

        const padding = 8;
        ctx.font = `bold ${fontSize}px ${fontFamily}`;
        ctx.textBaseline = 'top';

        const statementWidth = ctx.measureText(statement).width;
        const textHeight = fontSize * 1.2;
        const offset = (idx + 1) * (textHeight + 30);

        const rectX = canvasWidth - statementWidth - 2 * padding;
        const rectY = offset - padding;
        const text1X = canvasWidth - statementWidth - padding;
        const text1Y = rectY + padding;

        ctx.fillStyle = 'rgba(184, 82, 82, 1)';
        ctx.fillRect(rectX, rectY, statementWidth + padding * 2, textHeight + padding * 2);

        ctx.fillStyle = 'rgba(207, 152, 85, 1)';

        drawTriangle({
          ctx,
          endX: rectX,
          startY: rectY + (textHeight + padding * 2) / 2,
        });

        ctx.fillStyle = 'white';
        ctx.fillText(statement, text1X, text1Y + 5);
      });
    },
    [drawTriangle, fontFamily],
  );

  const drawUserName = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      name: string | null,
      fontSize: number,
      offsetMultiplier: number,
    ) => {
      if (!name) return;

      ctx.font = `bold ${fontSize}px ${fontFamily}`;
      ctx.textBaseline = 'top';

      const textWidth = ctx.measureText(name).width;
      const textY = (offsetMultiplier + 1) * 105;
      const padding = 16;
      const textX = canvasWidth - textWidth - padding;

      ctx.fillStyle = 'rgb(255, 255, 255)';
      ctx.fillText(name, textX, textY);
    },
    [fontFamily],
  );

  const applyTintEffect = useCallback(
    (ctx: CanvasRenderingContext2D | null, width: number, height: number) => {
      if (!ctx) return;
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      const startColor = { r: 0, g: 0, b: 0 };
      const endColor = { r: 64, g: 224, b: 208 };

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const brightnessValue = (r + g + b) / 3;

        const t = brightnessValue / 255;
        data[i] = startColor.r * (1 - t) + endColor.r * t;
        data[i + 1] = startColor.g * (1 - t) + endColor.g * t;
        data[i + 2] = startColor.b * (1 - t) + endColor.b * t;
      }

      ctx.putImageData(imageData, 0, 0);
    },
    [],
  );

  const makePhoto = () => {
    if (!canvasRef.current || !webcamRef.current) return;
    setStart(true);
    setTimeout(() => {
      setCountdownCompleted(true);
      setStart(false);
    }, 3050);
  };

  useEffect(() => {
    if (!countdownCompleted || !canvasRef.current || !webcamRef.current) return;

    const targetCanvas = canvasRef.current;
    const targetCtx = targetCanvas.getContext('2d');
    const sourceCanvas = webcamRef.current.getCanvas();
    const statementFontSize = 18;
    const userFontSize = 35;

    if (sourceCanvas && targetCtx) {
      targetCanvas.width = canvasWidth;
      targetCanvas.height = canvasHeight;

      const videoAspectRatio = sourceCanvas.width / sourceCanvas.height;
      const drawHeight = canvasWidth / videoAspectRatio;
      targetCtx.drawImage(sourceCanvas, 0, 0, canvasWidth, drawHeight);

      applyTintEffect(targetCtx, canvasWidth, drawHeight);
      drawUserName(targetCtx, userName, userFontSize, statements?.length ?? 0);
      drawStatements(targetCtx, statements, statementFontSize);

      targetCanvas.toBlob(async (blob) => {
        const filename = 'poster_' + uuidv4() + '_' + location + '.jpeg';
        setFilename(filename);
        if (blob) {
          const formData = new FormData();
          formData.append('blob', blob);
          formData.append('fileName', filename);

          await photoboothApi.uploadPoster(formData);
          setCountdownCompleted(false);
          setStage(thisStage + 1);
        }
      }, 'image/jpeg');
    }
  }, [
    applyTintEffect,
    drawStatements,
    drawUserName,
    countdownCompleted,
    statements,
    userName,
    location,
    setStage,
    setFilename,
  ]);

  if (stage !== thisStage) {
    canvasRef.current?.remove();
    return null;
  }

  return (
    <>
      <div className="relative flex h-screen w-screen flex-col items-center bg-black_bg">
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          mirrored={true}
          videoConstraints={{
            aspectRatio: canvasWidth / canvasHeight,
            width: canvasWidth,
            height: canvasHeight,
            facingMode: 'user',
            frameRate: 20,
          }}
          style={{ width: canvasWidth, height: canvasHeight }}
          className="m-auto"
        />
        {!countdown && !countdownCompleted && (
          <Button
            className={`${boothBtn} absolute bottom-0 left-0 right-0 top-0 m-auto max-w-max bg-darkRed px-10 py-5 text-2xl hover:bg-pink`}
            onClick={makePhoto}
          >
            {take}
          </Button>
        )}
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: canvasWidth,
            height: canvasHeight,
            zIndex: -1,
          }}
        />
      </div>
      <CountDown start={countdown} />
      <BackBtn />
    </>
  );
};
