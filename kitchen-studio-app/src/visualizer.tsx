"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  KITCHEN_BASE_IMAGE,
  KitchenScenePhoto,
  resolveSceneLayers,
} from "./kitchen-scene-photo";
import { api, type CategoryId, type Material } from "./api";

type MaterialOption = {
  id: string;
  name: string;
  note: string;
  surface: string;
  swatch: string;
  layerUrl?: string;
  edgeLayerUrl?: string | null;
};

type Category = {
  id: CategoryId;
  label: string;
  prompt: string;
  options: MaterialOption[];
};

type Selections = Record<CategoryId, string>;

const defaultCategories: Category[] = [
  {
    id: "cabinetry",
    label: "Cabinetry",
    prompt: "Set the tone around the room",
    options: [
      {
        id: "linen",
        name: "Stone Putty",
        note: "Soft mineral matte",
        surface: "#a49b8f",
        swatch: "#a49b8f",
      },
      {
        id: "sage",
        name: "Garden Sage",
        note: "Muted mineral paint",
        surface: "#768073",
        swatch: "#7d887a",
      },
      {
        id: "walnut",
        name: "Smoked Walnut",
        note: "Linear wood grain",
        surface:
          "repeating-linear-gradient(92deg, #655044 0 9px, #775d4d 10px 17px, #58453b 18px 20px)",
        swatch: "#6b5345",
      },
      {
        id: "ink",
        name: "Inkwell",
        note: "Original scene · deep satin paint",
        surface: "#263134",
        swatch: "#273235",
      },
    ],
  },
  {
    id: "island",
    label: "Island",
    prompt: "Give the center its own character",
    options: [
      {
        id: "charcoal",
        name: "Charcoal",
        note: "Original scene · architectural matte",
        surface: "#2d3737",
        swatch: "#303a3a",
      },
      {
        id: "white-oak",
        name: "White Oak",
        note: "Natural rift grain",
        surface:
          "repeating-linear-gradient(88deg, #b99a73 0 9px, #c6aa83 10px 17px, #a98c69 18px 20px)",
        swatch: "#b99a73",
      },
      {
        id: "clay",
        name: "Fired Clay",
        note: "Warm hand-painted finish",
        surface: "#955c48",
        swatch: "#9a604b",
      },
      {
        id: "moss",
        name: "Deep Moss",
        note: "Rich satin paint",
        surface: "#3f5048",
        swatch: "#42534b",
      },
    ],
  },
  {
    id: "countertops",
    label: "Countertops",
    prompt: "Balance movement with calm",
    options: [
      {
        id: "soft-quartz",
        name: "Soft Quartz",
        note: "Original scene · quiet warm white",
        surface: "#e8e2d8",
        swatch: "#e8e2d8",
      },
      {
        id: "calacatta",
        name: "Calacatta Mist",
        note: "Wide soft veining",
        surface:
          "repeating-linear-gradient(155deg, #ece9e1 0 24px, #b8b2a7 25px 26px, #e8e4dc 27px 58px)",
        swatch: "linear-gradient(145deg, #ece9e1 55%, #aaa49a 57%, #ece9e1 60%)",
      },
      {
        id: "soapstone",
        name: "Night Soapstone",
        note: "Low-contrast charcoal",
        surface:
          "repeating-linear-gradient(160deg, #343a39 0 28px, #6e7470 29px 30px, #303635 31px 66px)",
        swatch: "#343a39",
      },
      {
        id: "travertine",
        name: "Warm Travertine",
        note: "Fine linear texture",
        surface:
          "repeating-linear-gradient(0deg, #c9b495 0 7px, #dbc8a9 8px 11px, #baa486 12px 13px)",
        swatch: "#c9b495",
      },
    ],
  },
  {
    id: "backsplash",
    label: "Backsplash",
    prompt: "Choose the room's rhythm",
    options: [
      {
        id: "slab",
        name: "Marble Field",
        note: "Original scene · honed marble tile",
        surface: "#dad4c8",
        swatch: "#dad4c8",
      },
      {
        id: "zellige",
        name: "Bone Zellige",
        note: "Handmade square tile",
        surface:
          "linear-gradient(#8e897f 1px, transparent 1px), linear-gradient(90deg, #8e897f 1px, #d9d2c4 1px)",
        swatch:
          "linear-gradient(#918c82 2px, transparent 2px), linear-gradient(90deg, #918c82 2px, #d9d2c4 2px)",
      },
      {
        id: "terracotta",
        name: "Terracotta Grid",
        note: "Warm geometric tile",
        surface:
          "linear-gradient(#8b5745 1px, transparent 1px), linear-gradient(90deg, #8b5745 1px, #aa6952 1px)",
        swatch:
          "linear-gradient(#81503f 2px, transparent 2px), linear-gradient(90deg, #81503f 2px, #aa6952 2px)",
      },
      {
        id: "sage-tile",
        name: "Sea Glass",
        note: "Soft gloss subway",
        surface:
          "linear-gradient(#536c65 1px, transparent 1px), linear-gradient(90deg, #536c65 1px, #789087 1px)",
        swatch: "#789087",
      },
    ],
  },
  {
    id: "flooring",
    label: "Flooring",
    prompt: "Ground the palette",
    options: [
      {
        id: "natural-oak",
        name: "Natural Oak",
        note: "Original scene · wide plank, matte",
        surface:
          "repeating-linear-gradient(96deg, #a98b66 0 18px, #bea17a 19px 35px, #937657 36px 38px)",
        swatch: "#ad906c",
      },
      {
        id: "pale-stone",
        name: "Pale Limestone",
        note: "Large-format honed tile",
        surface:
          "linear-gradient(#938f86 1px, transparent 1px), linear-gradient(90deg, #938f86 1px, #c8c1b3 1px)",
        swatch: "#c8c1b3",
      },
      {
        id: "walnut-floor",
        name: "Heritage Walnut",
        note: "Deep natural plank",
        surface:
          "repeating-linear-gradient(96deg, #5c4638 0 19px, #725747 20px 34px, #49392f 35px 38px)",
        swatch: "#5d4739",
      },
      {
        id: "warm-concrete",
        name: "Warm Concrete",
        note: "Seamless mineral finish",
        surface: "#9d9588",
        swatch: "#9d9588",
      },
    ],
  },
  {
    id: "walls",
    label: "Walls",
    prompt: "Tune the light around everything",
    options: [
      {
        id: "plaster",
        name: "Plaster White",
        note: "Original scene · warm and luminous",
        surface: "#e4dfd3",
        swatch: "#e4dfd3",
      },
      {
        id: "greige",
        name: "Mushroom",
        note: "Balanced warm greige",
        surface: "#b6aa98",
        swatch: "#b6aa98",
      },
      {
        id: "olive",
        name: "Silver Olive",
        note: "Muted botanical tone",
        surface: "#8e927e",
        swatch: "#8e927e",
      },
      {
        id: "clay-wall",
        name: "Pale Clay",
        note: "Soft mineral blush",
        surface: "#c8a28f",
        swatch: "#c8a28f",
      },
    ],
  },
];

const defaultSelections: Selections = {
  cabinetry: "linen",
  island: "charcoal",
  countertops: "soft-quartz",
  backsplash: "slab",
  flooring: "natural-oak",
  walls: "plaster",
};

/* The former screen-space recoloring renderer is retained only as migration
   history in this branch and is intentionally excluded from the build.
type Point = readonly [number, number];
type RGB = readonly [number, number, number];

const materialTones: Record<string, RGB> = {
  linen: [164, 155, 143],
  sage: [118, 128, 115],
  walnut: [103, 79, 65],
  ink: [38, 49, 52],
  charcoal: [45, 55, 55],
  "white-oak": [185, 154, 115],
  clay: [149, 92, 72],
  moss: [63, 80, 72],
  "soft-quartz": [232, 226, 216],
  calacatta: [218, 215, 207],
  soapstone: [52, 58, 57],
  travertine: [201, 180, 149],
  slab: [218, 212, 200],
  zellige: [217, 210, 196],
  terracotta: [170, 105, 82],
  "sage-tile": [120, 144, 135],
  "natural-oak": [173, 144, 108],
  "pale-stone": [200, 193, 179],
  "walnut-floor": [93, 71, 57],
  "warm-concrete": [157, 149, 136],
  plaster: [228, 223, 211],
  greige: [182, 170, 152],
  olive: [142, 146, 126],
  "clay-wall": [200, 162, 143],
};

const sceneRegions: Record<CategoryId, Point[][]> = {
  cabinetry: [
    [[0.208, 0.616], [0.422, 0.589], [0.424, 0.754], [0.389, 0.816], [0.208, 0.813]],
    [[0.422, 0.593], [0.615, 0.567], [0.744, 0.571], [0.838, 0.572], [0.985, 0.597], [0.984, 0.764], [0.914, 0.781], [0.832, 0.744], [0.756, 0.717], [0.687, 0.702], [0.611, 0.694], [0.516, 0.722], [0.424, 0.755]],
    [[0.852, 0.211], [0.988, 0.207], [0.988, 0.486], [0.851, 0.481]],
  ],
  island: [
    [[0.393, 0.661], [0.59, 0.687], [0.59, 1], [0.393, 0.92]],
    [[0.589, 0.678], [0.827, 0.625], [0.826, 0.693], [0.59, 0.743]],
  ],
  countertops: [
    [[0.381, 0.639], [0.759, 0.573], [0.838, 0.624], [0.611, 0.722], [0.393, 0.695]],
    [[0.202, 0.603], [0.421, 0.575], [0.425, 0.604], [0.204, 0.635]],
    [[0.421, 0.575], [0.614, 0.537], [0.721, 0.544], [0.72, 0.57], [0.614, 0.564], [0.425, 0.604]],
    [[0.721, 0.544], [0.987, 0.573], [0.987, 0.602], [0.828, 0.592], [0.72, 0.57]],
  ],
  backsplash: [
    [[0.201, 0.49], [0.328, 0.489], [0.328, 0.594], [0.202, 0.604]],
    [[0.328, 0.537], [0.482, 0.531], [0.482, 0.578], [0.328, 0.594]],
    [[0.482, 0.467], [0.711, 0.456], [0.711, 0.546], [0.615, 0.54], [0.482, 0.578]],
    [[0.711, 0.246], [0.762, 0.24], [0.762, 0.445], [0.711, 0.546]],
    [[0.825, 0.24], [0.851, 0.228], [0.851, 0.481], [0.825, 0.439]],
    [[0.711, 0.445], [0.825, 0.439], [0.851, 0.481], [0.987, 0.485], [0.987, 0.573], [0.711, 0.546]],
  ],
  flooring: [
    [[0, 0.85], [0.205, 0.81], [0.392, 0.816], [0.393, 0.92], [0.39, 1], [0, 1]],
    [[0.827, 0.75], [1, 0.723], [1, 1], [0.827, 1]],
  ],
  walls: [
    [[0.186, 0.18], [0.332, 0.218], [0.332, 0.49], [0.201, 0.49], [0.201, 0.487], [0.186, 0.487]],
    [[0.478, 0.274], [0.708, 0.278], [0.708, 0.455], [0.482, 0.467], [0.482, 0.372], [0.478, 0.367]],
  ],
};

const processingOrder: CategoryId[] = [
  "walls",
  "flooring",
  "backsplash",
  "cabinetry",
  "island",
  "countertops",
];

function rgbToHsl(r: number, g: number, b: number) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  let hue = 0;
  let saturation = 0;
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue = ((hue * 60) + 360) % 360;
  }

  return [hue, saturation, lightness] as const;
}

function hslToRgb(hue: number, saturation: number, lightness: number): RGB {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const section = hue / 60;
  const second = chroma * (1 - Math.abs((section % 2) - 1));
  let red = 0;
  let green = 0;
  let blue = 0;

  if (section < 1) [red, green] = [chroma, second];
  else if (section < 2) [red, green] = [second, chroma];
  else if (section < 3) [green, blue] = [chroma, second];
  else if (section < 4) [green, blue] = [second, chroma];
  else if (section < 5) [red, blue] = [second, chroma];
  else [red, blue] = [chroma, second];

  const match = lightness - chroma / 2;
  return [
    Math.round((red + match) * 255),
    Math.round((green + match) * 255),
    Math.round((blue + match) * 255),
  ];
}

function surfacePixelMatches(
  category: CategoryId,
  red: number,
  green: number,
  blue: number,
) {
  const [, saturation, lightness] = rgbToHsl(red, green, blue);

  switch (category) {
    case "cabinetry":
      return lightness > 0.22 && lightness < 0.82 && saturation < 0.34;
    case "island":
      return lightness < 0.48;
    case "countertops":
      return lightness > 0.5 && saturation < 0.28;
    case "backsplash":
      return lightness > 0.42 && saturation < 0.3;
    case "flooring":
      return lightness > 0.18 && lightness < 0.78 && red > blue * 1.02;
    case "walls":
      return lightness > 0.4 && saturation < 0.28;
  }
}

function createRegionMask(
  category: CategoryId,
  width: number,
  height: number,
) {
  const hardMask = document.createElement("canvas");
  hardMask.width = width;
  hardMask.height = height;
  const hardContext = hardMask.getContext("2d")!;
  hardContext.fillStyle = "white";

  for (const polygon of sceneRegions[category]) {
    hardContext.beginPath();
    polygon.forEach(([x, y], index) => {
      if (index === 0) hardContext.moveTo(x * width, y * height);
      else hardContext.lineTo(x * width, y * height);
    });
    hardContext.closePath();
    hardContext.fill();
  }

  const softMask = document.createElement("canvas");
  softMask.width = width;
  softMask.height = height;
  const softContext = softMask.getContext("2d")!;
  softContext.filter = "blur(2.5px)";
  softContext.drawImage(hardMask, 0, 0);
  return softContext.getImageData(0, 0, width, height).data;
}

function renderMaterialScene(
  context: CanvasRenderingContext2D,
  sourceImage: HTMLImageElement,
  selections: Selections,
  showOriginal: boolean,
) {
  const { width, height } = context.canvas;
  context.drawImage(sourceImage, 0, 0, width, height);
  if (showOriginal) return;

  const image = context.getImageData(0, 0, width, height);
  const pixels = image.data;

  for (const category of processingOrder) {
    const selection = selections[category];
    if (selection === defaultSelections[category]) continue;
    const target = materialTones[selection];
    if (!target) continue;

    const mask = createRegionMask(category, width, height);
    const [targetHue, targetSaturation, targetLightness] = rgbToHsl(...target);

    for (let index = 0; index < pixels.length; index += 4) {
      const maskAlpha = mask[index + 3] / 255;
      if (maskAlpha < 0.02) continue;
      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      if (!surfacePixelMatches(category, red, green, blue)) continue;

      const [, sourceSaturation, sourceLightness] = rgbToHsl(red, green, blue);
      const mappedLightness = Math.min(
        0.94,
        Math.max(0.05, targetLightness * 0.7 + (sourceLightness - 0.5) * 0.58),
      );
      const mapped = hslToRgb(
        targetHue,
        Math.min(0.78, targetSaturation * 0.9 + sourceSaturation * 0.1),
        mappedLightness,
      );
      const strength = maskAlpha * (category === "walls" ? 0.7 : 0.84);
      pixels[index] = Math.round(red * (1 - strength) + mapped[0] * strength);
      pixels[index + 1] = Math.round(
        green * (1 - strength) + mapped[1] * strength,
      );
      pixels[index + 2] = Math.round(
        blue * (1 - strength) + mapped[2] * strength,
      );
    }
  }

  context.putImageData(image, 0, 0);
}

function KitchenScene({
  selections,
  showOriginal,
}: {
  selections: Selections;
  showOriginal: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageReady, setImageReady] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);

  useEffect(() => {
    const sourceImage = new window.Image();
    sourceImage.decoding = "async";
    sourceImage.src = "/kitchen-base.jpg";
    sourceImage.onload = () => {
      imageRef.current = sourceImage;
      setImageReady(true);
    };
    return () => {
      sourceImage.onload = null;
    };
  }, []);

  useEffect(() => {
    if (!imageReady || !imageRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;

    const frame = window.requestAnimationFrame(() => {
      renderMaterialScene(
        context,
        imageRef.current!,
        selections,
        showOriginal,
      );
      setCanvasReady(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [imageReady, selections, showOriginal]);

  return (
    <>
      <Image
        src="/kitchen-base.jpg"
        alt=""
        aria-hidden="true"
        width={3400}
        height={2267}
        sizes="(max-width: 980px) 100vw, 70vw"
        priority
      />
      <canvas
        ref={canvasRef}
        className={`scene-render ${canvasReady ? "is-ready" : ""}`}
        width={1200}
        height={800}
        role="img"
        aria-label="Bright kitchen preview showing the selected cabinetry, island, counters, backsplash, flooring, and wall colors"
      />
    </>
  );
}
*/

const storageKey = "kitchen-studio-guest-design-v1";
const legacyStorageKey = "forma-guest-design-v1";
const maxBrowserUploadBytes = 900_000;
const brandMark = `${import.meta.env.BASE_URL}brand/rhi-roof-mark.png`;

function getOption(categories: Category[], categoryId: CategoryId, optionId: string) {
  return categories
    .find((category) => category.id === categoryId)
    ?.options.find((option) => option.id === optionId);
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`A design layer could not be loaded (${new URL(source, document.baseURI).pathname}). Refresh and try again.`));
    image.src = source;
  });
}

function fitText(context: CanvasRenderingContext2D, value: string, maxWidth: number) {
  if (context.measureText(value).width <= maxWidth) return value;
  let shortened = value;
  while (shortened.length > 1 && context.measureText(`${shortened}…`).width > maxWidth) {
    shortened = shortened.slice(0, -1);
  }
  return `${shortened}…`;
}

async function createDesignImage(
  selections: Selections,
  categories: Category[],
  details: Array<{ label: string; option: MaterialOption }>,
) {
  const layerPaths = resolveSceneLayers(selections, categories).map(({ path }) => path);
  const [base, mark, ...layers] = await Promise.all([
    loadImage(KITCHEN_BASE_IMAGE),
    loadImage(brandMark),
    ...layerPaths.map(loadImage),
  ]);
  const canvas = document.createElement("canvas");
  canvas.width = 1536;
  canvas.height = 1400;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser could not prepare the design image.");

  context.fillStyle = "#f7f8f6";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(base, 0, 0, 1536, 1024);
  layers.forEach((layer) => context.drawImage(layer, 0, 0, 1536, 1024));

  context.fillStyle = "#021f48";
  context.fillRect(0, 1024, 1536, 5);
  context.drawImage(mark, 64, 1060, 185, 68);
  context.fillStyle = "#021f48";
  context.font = '700 30px "Avenir Next", Arial, sans-serif';
  context.fillText("KITCHEN STUDIO", 280, 1092);
  context.font = '22px "Avenir Next", Arial, sans-serif';
  context.fillStyle = "#586b80";
  context.fillText("My saved material palette", 280, 1122);
  context.textAlign = "right";
  context.fillText(
    new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date()),
    1472,
    1096,
  );
  context.textAlign = "left";

  details.forEach(({ label, option }, index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);
    const x = 64 + column * 490;
    const y = 1170 + row * 104;
    const swatch = /^#[0-9a-f]{6}$/i.test(option.swatch) ? option.swatch : "#778da9";
    context.fillStyle = swatch;
    context.beginPath();
    context.arc(x + 25, y + 28, 22, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(2,31,72,0.18)";
    context.stroke();
    context.fillStyle = "#586b80";
    context.font = '700 16px "Avenir Next", Arial, sans-serif';
    context.fillText(label.toUpperCase(), x + 62, y + 18);
    context.fillStyle = "#021f48";
    context.font = '27px Georgia, "Times New Roman", serif';
    context.fillText(fitText(context, option.name, 365), x + 62, y + 50);
  });

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("The design image could not be created.")),
      "image/jpeg",
      0.9,
    ),
  );
}

function downloadDesignImage(image: Blob) {
  const date = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(image);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ridgewood-kitchen-design-${date}.jpg`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function prepareKitchenPhoto(photo: File) {
  if (photo.size <= maxBrowserUploadBytes) return photo;

  const image = await createImageBitmap(photo);
  const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This photo could not be prepared. Please choose another image.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.72),
  );
  if (!blob) throw new Error("This photo could not be prepared. Please choose another image.");
  return new File(
    [blob],
    `${photo.name.replace(/\.[^.]+$/, "") || "kitchen"}.jpg`,
    { type: "image/jpeg" },
  );
}

export function KitchenVisualizer() {
  const [categories, setCategories] = useState(defaultCategories);
  const [activeCategory, setActiveCategory] =
    useState<CategoryId>("cabinetry");
  const [selections, setSelections] =
    useState<Selections>(defaultSelections);
  const [past, setPast] = useState<Selections[]>([]);
  const [future, setFuture] = useState<Selections[]>([]);
  const [zoom, setZoom] = useState(1);
  const [saveOpen, setSaveOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [saveComplete, setSaveComplete] = useState(false);
  const [saveSending, setSaveSending] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [designImage, setDesignImage] = useState<Blob | null>(null);
  const saveSubmissionId = useRef(crypto.randomUUID());
  const [uploadSending, setUploadSending] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadName, setUploadName] = useState("");
  const [uploadJobId, setUploadJobId] = useState("");
  const [savedDesign, setSavedDesign] = useState<{
    email: string;
    name: string;
    phone: string;
    customerEmailed: boolean;
  } | null>(null);

  useEffect(() => {
    if (!saveOpen && !uploadOpen && !quoteOpen) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = document.querySelector<HTMLElement>('.dialog[role="dialog"]');
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
    ) ?? []);
    window.requestAnimationFrame(() => (dialog?.querySelector<HTMLElement>("[autofocus]") ?? focusable()[0])?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSaveOpen(false);
        setUploadOpen(false);
        setQuoteOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [saveOpen, uploadOpen, quoteOpen]);

  useEffect(() => {
    const stored =
      window.localStorage.getItem(storageKey) ??
      window.localStorage.getItem(legacyStorageKey);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as {
        email?: unknown;
        name?: unknown;
        phone?: unknown;
        selections?: Partial<Selections>;
      } & Partial<Selections>;
      const savedSelections = {
        ...defaultSelections,
        ...(parsed.selections ?? parsed),
      } as Selections;
      const frame = window.requestAnimationFrame(() => {
        setSelections(savedSelections);
        if (typeof parsed.email === "string" && typeof parsed.name === "string") {
          setSavedDesign({
            email: parsed.email,
            name: parsed.name,
            phone: typeof parsed.phone === "string" ? parsed.phone : "",
            customerEmailed: true,
          });
        }
      });
      return () => window.cancelAnimationFrame(frame);
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, []);

  useEffect(() => {
    api<{ materials: Material[] }>("/materials")
      .then(({ materials }) => {
        const managed = defaultCategories.map((category) => ({
          ...category,
          options: materials
            .filter((material) => material.category === category.id && material.enabled)
            .map((material) => ({
              id: material.id,
              name: material.name,
              note: material.note,
              surface: material.swatch,
              swatch: material.swatch,
              layerUrl: material.layer_url,
              edgeLayerUrl: material.edge_layer_url,
            })),
        }));
        if (managed.every((category) => category.options.length)) {
          setCategories(managed);
          setSelections((current) => Object.fromEntries(
            managed.map((category) => [
              category.id,
              category.options.some((option) => option.id === current[category.id])
                ? current[category.id]
                : category.options[0].id,
            ]),
          ) as Selections);
        }
      })
      .catch(() => undefined);
  }, []);

  const active = categories.find(
    (category) => category.id === activeCategory
  )!;

  const selectedDetails = useMemo(
    () =>
      categories.map((category) => ({
        label: category.label,
        option: getOption(categories, category.id, selections[category.id]) ?? category.options[0],
      })),
    [categories, selections]
  );

  function commit(next: Selections) {
    setPast((items) => [...items.slice(-19), selections]);
    setSelections(next);
    setFuture([]);
  }

  function choose(optionId: string) {
    if (selections[activeCategory] === optionId) return;
    commit({ ...selections, [activeCategory]: optionId });
  }

  function undo() {
    const previous = past[past.length - 1];
    if (!previous) return;
    setPast((items) => items.slice(0, -1));
    setFuture((items) => [selections, ...items].slice(0, 20));
    setSelections(previous);
  }

  function redo() {
    const next = future[0];
    if (!next) return;
    setFuture((items) => items.slice(1));
    setPast((items) => [...items, selections].slice(-20));
    setSelections(next);
  }

  function resetDesign() {
    const availableDefaults = Object.fromEntries(
      categories.map((category) => [category.id, category.options[0].id]),
    ) as Selections;
    if (JSON.stringify(selections) === JSON.stringify(availableDefaults)) return;
    commit(availableDefaults);
  }

  async function saveDesign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const name = String(form.get("name") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    if (!email || !name || !phone) return;
    setSaveSending(true);
    setSaveError("");
    try {
      const image = await createDesignImage(selections, categories, selectedDetails);
      const finishes = selectedDetails.map(({ label, option }) => ({
        label,
        name: option.name,
      }));
      const payload = new FormData();
      payload.set("submission_id", saveSubmissionId.current);
      payload.set("name", name);
      payload.set("email", email);
      payload.set("phone", phone);
      payload.set("finishes", JSON.stringify(finishes));
      payload.set("image", image, "ridgewood-kitchen-design.jpg");
      const result = await api<{ leadNotified: boolean; customerEmailed: boolean }>("/save-design", {
        method: "POST",
        body: payload,
      });
      if (!result.leadNotified) throw new Error("Ridgewood could not be notified.");
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ email, name, phone, selections }),
      );
      setSavedDesign({ email, name, phone, customerEmailed: result.customerEmailed });
      setDesignImage(image);
      downloadDesignImage(image);
      setSaveComplete(true);
      saveSubmissionId.current = crypto.randomUUID();
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Your design could not be delivered. Check your information and try again.",
      );
    } finally {
      setSaveSending(false);
    }
  }

  async function submitKitchen(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const photo = form.get("photo");
    if (!(photo instanceof File) || photo.size === 0) return;
    setUploadSending(true);
    setUploadError("");
    try {
      const preparedPhoto = await prepareKitchenPhoto(photo);
      form.set("photo", preparedPhoto, preparedPhoto.name);
      const result = await api<{ jobId: string }>("/kitchens", {
        method: "POST",
        body: form,
      });
      setUploadJobId(result.jobId);
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "The kitchen could not be submitted.",
      );
    } finally {
      setUploadSending(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#studio" aria-label="Kitchen Studio home">
          <img className="brand-logo" src={brandMark} alt="" />
          <span>Kitchen Studio</span>
        </a>
        <div className="project-name">
          <span className="eyebrow">Ridgewood Home Improvement</span>
          <strong>Kitchen material study</strong>
        </div>
        <nav className="top-actions" aria-label="Project actions">
          <button className="quiet-button new-kitchen-button" onClick={() => { setUploadError(""); setUploadJobId(""); setUploadOpen(true); }}>
            New kitchen
          </button>
          <button className="quiet-button desktop-only" onClick={() => setHelpOpen(!helpOpen)}>
            How it works
          </button>
          <button className="quiet-button" onClick={() => setQuoteOpen(true)}>
            Request a consultation
          </button>
          <button className="primary-button" onClick={() => { setSaveComplete(false); setSaveError(""); setDesignImage(null); setSaveOpen(true); }}>
            Save my design
          </button>
        </nav>
      </header>

      <section className="intro" id="studio">
        <div>
          <p className="eyebrow">Your kitchen · Fixed camera</p>
          <h1>See the whole room<br />before you commit.</h1>
        </div>
        <p className="intro-copy">
          Explore a considered palette of cabinetry, stone, tile, color, and
          flooring. Every choice stays with this guest design until you decide
          to save it.
        </p>
      </section>

      <section className="designer" aria-label="Kitchen material visualizer">
        <div className="scene-panel">
          <div className="scene-toolbar">
            <div className="history-controls" aria-label="Design history">
              <button onClick={undo} disabled={!past.length} aria-label="Undo last change">↶</button>
              <button onClick={redo} disabled={!future.length} aria-label="Redo last change">↷</button>
              <button className="text-control" onClick={resetDesign}>Reset</button>
            </div>
            <span className="scene-instruction">Tap any surface to explore it</span>
          </div>

          <div className="scene-viewport">
            <div
              className="scene-content"
              style={{ transform: `scale(${zoom})` }}
            >
              <KitchenScenePhoto
                selections={selections}
                categories={categories}
                onSurfaceSelect={setActiveCategory}
              />
            </div>

            <div className="scene-caption">
              <span>Kitchen Studio · Fixed view</span>
            </div>

            <div className="zoom-control" aria-label="Image zoom">
              <button
                onClick={() => setZoom((value) => Math.max(1, +(value - 0.08).toFixed(2)))}
                disabled={zoom <= 1}
                aria-label="Zoom out"
              >
                −
              </button>
              <span>{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom((value) => Math.min(1.32, +(value + 0.08).toFixed(2)))}
                disabled={zoom >= 1.32}
                aria-label="Zoom in"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <aside className="material-panel">
          <div className="category-tabs" role="tablist" aria-label="Material categories">
            {categories.map((category, index) => {
              const selected = getOption(categories, category.id, selections[category.id]);
              return (
                <button
                  key={category.id}
                  className={activeCategory === category.id ? "active" : ""}
                  onClick={() => setActiveCategory(category.id)}
                  role="tab"
                  aria-selected={activeCategory === category.id}
                >
                  <span className="category-number">0{index + 1}</span>
                  <span className="category-label">
                    <strong>{category.label}</strong>
                    <small>{selected?.name}</small>
                  </span>
                  <span
                    className="mini-swatch"
                    style={{ background: selected?.swatch }}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>

          <div className="option-drawer">
            <div className="drawer-heading">
              <div>
                <p className="eyebrow">{active.label}</p>
                <h2>{active.prompt}</h2>
              </div>
              <span>{active.options.length} finishes</span>
            </div>

            <div className="material-options">
              {active.options.map((option) => {
                const selected = selections[activeCategory] === option.id;
                return (
                  <button
                    key={option.id}
                    className={`material-option ${selected ? "selected" : ""}`}
                    onClick={() => choose(option.id)}
                    aria-pressed={selected}
                  >
                    <span
                      className="large-swatch"
                      style={{ background: option.swatch }}
                      aria-hidden="true"
                    />
                    <span>
                      <strong>{option.name}</strong>
                      <small>{option.note}</small>
                    </span>
                    <span className="selection-indicator" aria-hidden="true">
                      {selected ? "✓" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </section>

      <section className="selection-summary" aria-label="Current material selections">
        <div className="summary-heading">
          <p className="eyebrow">Current palette</p>
          <strong>{selectedDetails.length} selections</strong>
        </div>
        <div className="summary-list">
          {selectedDetails.map(({ label, option }) => (
            <button
              key={label}
              onClick={() =>
                setActiveCategory(
                  categories.find((category) => category.label === label)!.id
                )
              }
            >
              <span className="summary-swatch" style={{ background: option.swatch }} />
              <span>
                <small>{label}</small>
                <strong>{option.name}</strong>
              </span>
            </button>
          ))}
        </div>
      </section>

      <footer className="site-footer">
        <p>Design freely. Save when it matters.</p>
        <p>
          Ridgewood Home Improvement · Kitchen Studio
          <a className="manager-link" href="manager.html">Studio management</a>
        </p>
      </footer>

      {helpOpen && (
        <div className="help-note" role="status">
          <button onClick={() => setHelpOpen(false)} aria-label="Close help">×</button>
          <span className="eyebrow">No tutorial required</span>
          <strong>Choose a surface, then a finish.</strong>
          <p>Tap the kitchen or use the six surface tabs. Undo and redo are always available above the room.</p>
        </div>
      )}

      {saveOpen && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setSaveOpen(false)}>
          <section
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="dialog-close" onClick={() => setSaveOpen(false)} aria-label="Close save dialog">×</button>
            {!saveComplete ? (
              <>
                <p className="eyebrow">Save your design</p>
                <h2 id="save-title">Send your kitchen design.</h2>
                <p className="dialog-copy">
                  We’ll prepare an image of your finished kitchen, email it to
                  you, and save a copy to this device.
                </p>
                <form onSubmit={saveDesign}>
                  <label>
                    Full name
                    <input
                      name="name"
                      type="text"
                      autoComplete="name"
                      defaultValue={savedDesign?.name ?? ""}
                      maxLength={80}
                      required
                      autoFocus
                    />
                  </label>
                  <label>
                    Email address
                    <input
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      defaultValue={savedDesign?.email ?? ""}
                      maxLength={254}
                      required
                    />
                  </label>
                  <label>
                    Phone number
                    <input
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="(201) 555-0123"
                      defaultValue={savedDesign?.phone ?? ""}
                      minLength={7}
                      maxLength={24}
                      required
                    />
                  </label>
                  <button className="primary-button full-button" type="submit" disabled={saveSending}>
                    {saveSending ? "Preparing your design…" : "Email & download my design"}
                  </button>
                </form>
                {saveError && <p className="form-error" role="alert">{saveError}</p>}
                <small className="privacy-note">
                  By requesting your design, you agree that Ridgewood Home Improvement may contact you about your kitchen project.
                </small>
              </>
            ) : (
              <div className="success-state">
                <span className="success-mark">✓</span>
                <p className="eyebrow">Design ready</p>
                <h2 id="save-title">Your kitchen design is ready.</h2>
                <p>
                  We downloaded a copy{savedDesign?.customerEmailed ? <> and emailed it to <strong>{savedDesign.email}</strong></> : null}.
                  {savedDesign?.customerEmailed
                    ? " Ridgewood Home Improvement may follow up to help with your selections."
                    : " The emailed copy could not be delivered, but Ridgewood received your request."}
                </p>
                <div className="success-actions">
                  <button className="primary-button" onClick={() => designImage && downloadDesignImage(designImage)}>Download image again</button>
                  <button className="quiet-button" onClick={() => setSaveOpen(false)}>Keep designing</button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {uploadOpen && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setUploadOpen(false)}>
          <section
            className="dialog upload-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="dialog-close" onClick={() => setUploadOpen(false)} aria-label="Close new kitchen dialog">×</button>
            {!uploadJobId ? (
              <>
                <p className="eyebrow">Start a new kitchen</p>
                <h2 id="upload-title">Photograph the room you want to change.</h2>
                <p className="dialog-copy">
                  Use a wide, well-lit view that shows the floor, main cabinets,
                  counters, backsplash, walls, and island when there is one.
                </p>
                <form onSubmit={submitKitchen}>
                  <label className="file-field">
                    Kitchen photograph
                    <input
                      name="photo"
                      type="file"
                      accept="image/*"
                      onClick={(event) => {
                        event.currentTarget.value = "";
                        setUploadName("");
                      }}
                      onChange={(event) => setUploadName(event.target.files?.[0]?.name ?? "")}
                      required
                    />
                    <span>{uploadName || "Take or choose a photo"}</span>
                  </label>
                  <button className="primary-button full-button" type="submit" disabled={uploadSending}>
                    {uploadSending ? "Submitting…" : "Build my kitchen"}
                  </button>
                </form>
                {uploadError && <p className="form-error" role="alert">{uploadError}</p>}
                <small className="privacy-note">
                  Pilot photos are retained for up to 90 days. A submitted kitchen
                  is not customer-visible until surface review passes.
                </small>
              </>
            ) : (
              <div className="success-state">
                <span className="success-mark">✓</span>
                <p className="eyebrow">Photo received</p>
                <h2 id="upload-title">Your kitchen is in review.</h2>
                <p>
                  Ridgewood will review the photograph before preparing its
                  fixed-view material study. Reference {uploadJobId}.
                </p>
                <button className="primary-button" onClick={() => setUploadOpen(false)}>Done</button>
              </div>
            )}
          </section>
        </div>
      )}

      {quoteOpen && (
        <div className="dialog-backdrop" role="presentation" onMouseDown={() => setQuoteOpen(false)}>
          <section
            className="dialog quote-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quote-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="dialog-close" onClick={() => setQuoteOpen(false)} aria-label="Close quote dialog">×</button>
            <p className="eyebrow">Your choice, your timing</p>
            <h2 id="quote-title">Bring this palette to a professional.</h2>
            <p className="dialog-copy">
              Continue to Ridgewood’s consultation form to discuss this palette
              with the remodeling team.
            </p>
            <div className="quote-palette">
              {selectedDetails.map(({ label, option }) => (
                <div key={label}>
                  <span style={{ background: option.swatch }} />
                  <small>{label}</small>
                  <strong>{option.name}</strong>
                </div>
              ))}
            </div>
            <a className="primary-button full-button" href="/#contact">
              Start a consultation
            </a>
          </section>
        </div>
      )}
    </main>
  );
}
