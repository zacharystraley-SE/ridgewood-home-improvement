"use client";

import type { PointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CategoryId } from "./api";

type Selections = Record<CategoryId, string>;

type Category = {
  id: CategoryId;
  options: Array<{
    id: string;
    layerUrl?: string;
    edgeLayerUrl?: string | null;
  }>;
};

type KitchenScenePhotoProps = {
  selections: Selections;
  categories: Category[];
  onSurfaceSelect: (category: CategoryId) => void;
};

const ASSET_ROOT = `${import.meta.env.BASE_URL}kitchen-renders/compositor`;
export const KITCHEN_BASE_IMAGE = `${ASSET_ROOT}/base.jpg`;

const PHOTO_LAYER_ORDER: CategoryId[] = [
  "walls",
  "flooring",
  "cabinetry",
  "island",
  "backsplash",
  "countertops",
];

const PHOTO_LAYERS: Record<CategoryId, Record<string, string>> = {
  cabinetry: {
    ink: `${ASSET_ROOT}/cabinetry/ink.webp`,
    linen: `${ASSET_ROOT}/cabinetry/linen.webp`,
    sage: `${ASSET_ROOT}/cabinetry/sage.webp`,
    walnut: `${ASSET_ROOT}/cabinetry/walnut.webp`,
  },
  island: {
    charcoal: `${ASSET_ROOT}/island/charcoal.webp`,
    "white-oak": `${ASSET_ROOT}/island/white-oak.webp`,
    clay: `${ASSET_ROOT}/island/clay.webp`,
    moss: `${ASSET_ROOT}/island/moss.webp`,
  },
  countertops: {
    "soft-quartz": `${ASSET_ROOT}/countertops/soft-quartz.webp`,
    calacatta: `${ASSET_ROOT}/countertops/calacatta.webp`,
    soapstone: `${ASSET_ROOT}/countertops/soapstone.webp`,
    travertine: `${ASSET_ROOT}/countertops/travertine.webp`,
  },
  backsplash: {
    slab: `${ASSET_ROOT}/backsplash/slab.webp`,
    zellige: `${ASSET_ROOT}/backsplash/zellige.webp`,
    terracotta: `${ASSET_ROOT}/backsplash/terracotta.webp`,
    "sage-tile": `${ASSET_ROOT}/backsplash/sage-tile.webp`,
  },
  flooring: {
    "natural-oak": `${ASSET_ROOT}/flooring/natural-oak.webp`,
    "pale-stone": `${ASSET_ROOT}/flooring/pale-stone.webp`,
    "walnut-floor": `${ASSET_ROOT}/flooring/walnut-floor.webp`,
    "warm-concrete": `${ASSET_ROOT}/flooring/warm-concrete.webp`,
  },
  walls: {
    plaster: `${ASSET_ROOT}/walls/plaster.webp`,
    greige: `${ASSET_ROOT}/walls/greige.webp`,
    olive: `${ASSET_ROOT}/walls/olive.webp`,
    "clay-wall": `${ASSET_ROOT}/walls/clay-wall.webp`,
  },
};

const FLOOR_EDGE_LAYERS: Record<string, string> = {
  "natural-oak": `${ASSET_ROOT}/flooring/edge-natural-oak.webp`,
  "pale-stone": `${ASSET_ROOT}/flooring/edge-pale-stone.webp`,
  "walnut-floor": `${ASSET_ROOT}/flooring/edge-walnut-floor.webp`,
  "warm-concrete": `${ASSET_ROOT}/flooring/edge-warm-concrete.webp`,
};

const MASKS: Record<CategoryId, string> = {
  cabinetry: `${ASSET_ROOT}/cabinetry/mask.png`,
  island: `${ASSET_ROOT}/island/mask.png`,
  countertops: `${ASSET_ROOT}/countertops/mask.png`,
  backsplash: `${ASSET_ROOT}/backsplash/mask.png`,
  flooring: `${ASSET_ROOT}/flooring/mask.png`,
  walls: `${ASSET_ROOT}/walls/mask.png`,
};

const HIT_ORDER: CategoryId[] = [
  "countertops",
  "island",
  "cabinetry",
  "backsplash",
  "flooring",
  "walls",
];

const PRELOAD_PATHS = [
  KITCHEN_BASE_IMAGE,
  ...PHOTO_LAYER_ORDER.flatMap((category) => Object.values(PHOTO_LAYERS[category])),
  ...Object.values(FLOOR_EDGE_LAYERS),
  ...Object.values(MASKS),
];

export function resolveSceneLayers(
  selections: Selections,
  categories: Category[],
  baseUri = document.baseURI,
) {
  const surfaces = PHOTO_LAYER_ORDER.flatMap((category) => {
    const managed = categories
      .find((item) => item.id === category)
      ?.options.find((option) => option.id === selections[category]);
    const path = managed?.layerUrl
      ? new URL(managed.layerUrl, baseUri).href
      : PHOTO_LAYERS[category][selections[category]];
    return path ? [{ category, path }] : [];
  });
  const managedFloor = categories
    .find((item) => item.id === "flooring")
    ?.options.find((option) => option.id === selections.flooring);
  const floorEdge = managedFloor?.edgeLayerUrl
    ? new URL(managedFloor.edgeLayerUrl, baseUri).href
    : FLOOR_EDGE_LAYERS[selections.flooring];
  return floorEdge
    ? [...surfaces, { category: "flooring" as const, path: floorEdge }]
    : surfaces;
}

export function KitchenScenePhoto({
  selections,
  categories,
  onSurfaceSelect,
}: KitchenScenePhotoProps) {
  const [isReady, setIsReady] = useState(false);
  const masks = useRef(
    new Map<CategoryId, { pixels: Uint8ClampedArray; width: number; height: number }>(),
  );

  useEffect(() => {
    let isCurrent = true;

    Promise.allSettled(
      PRELOAD_PATHS.map(
        (path) =>
          new Promise<void>((resolve) => {
            const image = new Image();
            image.onload = () => {
              const category = Object.entries(MASKS).find(
                ([, maskPath]) => maskPath === path,
              )?.[0] as CategoryId | undefined;
              if (category) {
                const canvas = document.createElement("canvas");
                canvas.width = image.naturalWidth;
                canvas.height = image.naturalHeight;
                const context = canvas.getContext("2d", {
                  willReadFrequently: true,
                });
                context?.drawImage(image, 0, 0);
                if (context) {
                  masks.current.set(category, {
                    pixels: context.getImageData(0, 0, canvas.width, canvas.height)
                      .data,
                    width: canvas.width,
                    height: canvas.height,
                  });
                }
              }
              resolve();
            };
            image.onerror = () => resolve();
            image.src = path;
          }),
      ),
    ).then(() => {
      if (isCurrent) setIsReady(true);
    });

    return () => {
      isCurrent = false;
    };
  }, []);

  const activeLayers = useMemo(() => {
    return resolveSceneLayers(selections, categories);
  }, [categories, selections]);

  function selectSurface(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const reference = masks.current.values().next().value;
    if (!reference) return;

    const imageRatio = reference.width / reference.height;
    const frameRatio = rect.width / rect.height;
    const renderedWidth =
      imageRatio > frameRatio ? rect.height * imageRatio : rect.width;
    const renderedHeight =
      imageRatio > frameRatio ? rect.height : rect.width / imageRatio;
    const imageLeft = rect.left + (rect.width - renderedWidth) / 2;
    const imageTop = rect.top + (rect.height - renderedHeight) / 2;
    const xRatio = (event.clientX - imageLeft) / renderedWidth;
    const yRatio = (event.clientY - imageTop) / renderedHeight;

    for (const category of HIT_ORDER) {
      const mask = masks.current.get(category);
      if (!mask) continue;
      const x = Math.min(mask.width - 1, Math.max(0, Math.floor(xRatio * mask.width)));
      const y = Math.min(
        mask.height - 1,
        Math.max(0, Math.floor(yRatio * mask.height)),
      );
      if (mask.pixels[(y * mask.width + x) * 4] > 80) {
        onSurfaceSelect(category);
        return;
      }
    }
  }

  return (
    <div
      className={`photo-scene ${isReady ? "is-ready" : ""}`}
      onPointerUp={selectSurface}
      aria-label="Kitchen preview. Tap a surface to open its available finishes."
    >
      <img
        className="photo-base"
        src={KITCHEN_BASE_IMAGE}
        alt="Photoreal kitchen with a wide island and fixed camera view"
        draggable={false}
      />

      {isReady && activeLayers.map(({ category, path }, index) => (
        <img
          key={`${index}-${category}-${path}`}
          className={`photo-layer photo-layer-${category}`}
          src={path}
          alt=""
          aria-hidden="true"
          draggable={false}
        />
      ))}

      {!isReady && <p className="photo-status">Preparing material study…</p>}
    </div>
  );
}
