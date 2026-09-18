import React, { useRef, useState, useEffect } from "react";
import { Trash2, Check, PenTool } from "lucide-react";

interface SignaturePadProps {
  currentSignature?: string;
  onSave: (base64Png: string) => void;
  onRemove: () => void;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  currentSignature,
  onSave,
  onRemove,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [saved, setSaved] = useState(Boolean(currentSignature));

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Ajustement DPI
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.strokeStyle = "#1E2A44"; // Indigo Bogolan
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  };

  useEffect(() => {
    initCanvas();
    const handleResize = () => initCanvas();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.setPointerCapture(e.pointerId);
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // Ignorer si non capturé
      }
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl);
    setSaved(true);
  };

  const handleRemoveExisting = () => {
    clearCanvas();
    onRemove();
    setSaved(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-[#1F1A15] flex items-center gap-1.5">
          <PenTool className="w-3.5 h-3.5 text-[#B5541F]" />
          <span>Signature manuscrite pour l'Attestation A4</span>
        </label>
        {saved && (
          <span className="text-[10px] font-medium text-[#4A6B3F] bg-[#4A6B3F]/10 px-2 py-0.5 rounded-full">
            Active
          </span>
        )}
      </div>

      {currentSignature && !hasDrawn ? (
        <div className="p-3 bg-white border border-[#E8DDC9] rounded-[12px] space-y-2">
          <div className="h-24 flex items-center justify-center bg-[#FAF6EF]/50 rounded-[8px] p-2 border border-dashed border-[#E8DDC9]">
            <img
              src={currentSignature}
              alt="Signature enregistrée"
              className="max-h-full object-contain"
            />
          </div>
          <div className="flex justify-between items-center pt-1">
            <span className="text-[10px] text-[#8A8884]">
              Apposée sur le PDF imprimé
            </span>
            <button
              type="button"
              onClick={handleRemoveExisting}
              className="text-xs text-[#A8453F] hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Remplacer la signature
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative border-2 border-dashed border-[#E8DDC9] bg-white rounded-[12px] overflow-hidden touch-none h-28">
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className="w-full h-full cursor-crosshair block"
            />
            {!hasDrawn && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs text-[#8A8884]">
                Signez ou paraphez ici avec le doigt ou la souris
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={clearCanvas}
              disabled={!hasDrawn}
              className="px-3 py-1.5 rounded-full text-xs font-medium text-[#55534F] bg-[#E8DDC9]/50 hover:bg-[#E8DDC9] disabled:opacity-30 transition-all flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Effacer
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={!hasDrawn}
              className="px-4 py-1.5 rounded-full text-xs font-semibold text-white bg-[#1E2A44] hover:bg-[#151E31] disabled:opacity-30 transition-all flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              Valider la signature
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
