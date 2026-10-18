import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Box3, Mesh, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  companions,
  companionCommand,
  companionInfo,
  isCompanionChoice,
} from "../packages/domain/companions";
import { createPikachuModel } from "../src/scene/pikachuModel";
import { prepareClayPartner } from "../src/scene/loadClayFox";
import { applyCompanionPose } from "../src/scene/companionPose";
import CompanionSticker from "../src/CompanionSticker";
import CompanionPicker from "../src/CompanionPicker";
import { applyCompanionChoice } from "../src/companionState";
import type { Identity } from "../packages/contracts/index";
const bytes = readFileSync(
  new URL("../src/assets/models/clay-pikachu-v1.glb", import.meta.url),
);
const asset = () =>
  new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    "",
  );
describe("saved clay partners", () => {
  it("ignores late preference responses after the active child or version has changed", () => {
    const identity: Identity = {
      authenticated: true,
      developmentIdentityAvailable: false,
      child: {
        id: "new-child",
        nickname: "小树",
        grade: 3,
        householdId: "family",
        companionId: "fox",
        companionVersion: 3,
      },
    };
    expect(
      applyCompanionChoice(identity, {
        childId: "old-child",
        companionId: "pikachu",
        version: 4,
      }),
    ).toBe(identity);
    expect(
      applyCompanionChoice(identity, {
        childId: "new-child",
        companionId: "pikachu",
        version: 2,
      }),
    ).toBe(identity);
    expect(
      applyCompanionChoice(identity, {
        childId: "new-child",
        companionId: "fox",
        version: 3,
      }),
    ).toBe(identity);
  });
  it("accepts a newer confirmed choice while retaining the current profile fields", () => {
    const identity: Identity = {
      authenticated: true,
      developmentIdentityAvailable: false,
      child: {
        id: "child",
        nickname: "小海",
        grade: 4,
        householdId: "family",
        companionId: "fox",
        companionVersion: 1,
      },
    };
    expect(
      applyCompanionChoice(identity, {
        childId: "child",
        companionId: "pikachu",
        version: 2,
      }),
    ).toEqual({
      ...identity,
      child: { ...identity.child, companionId: "pikachu", companionVersion: 2 },
    });
    expect(identity.child?.companionId).toBe("fox");
  });
  it("limits commands to known companions and an explicit child and version", () => {
    const valid = {
      childId: "child-one",
      companionId: "pikachu",
      expectedVersion: 0,
      requestId: "57ef4c06-4e53-49e1-9a17-b51a20372516",
    };
    expect(companionCommand(valid)).toEqual(valid);
    for (const patch of [
      { companionId: "raichu" },
      { childId: "" },
      { expectedVersion: -1 },
      { expectedVersion: 0.5 },
      { expectedVersion: 2147483647 },
      { requestId: "unsafe" },
    ])
      expect(companionCommand({ ...valid, ...patch })).toBeNull();
    for (const value of [null, [], "pikachu", {}])
      expect(companionCommand(value)).toBeNull();
    expect(companionInfo(undefined).id).toBe("fox");
    expect(
      isCompanionChoice(
        { childId: "other", companionId: "pikachu", version: 1 },
        "child-one",
      ),
    ).toBe(false);
    expect(
      isCompanionChoice(
        { childId: "child-one", companionId: "pikachu", version: 1 },
        "child-one",
      ),
    ).toBe(true);
  });
  it("binds 25 closed solids and attached face details to the real exported GLB", () => {
    const qa = JSON.parse(
      readFileSync(
        new URL("../design-assets/clay-pikachu-v1.qa.json", import.meta.url),
        "utf8",
      ),
    );
    expect(qa.glb_sha256).toBe(
      createHash("sha256").update(bytes).digest("hex"),
    );
    expect(qa.objects).toHaveLength(25);
    for (const row of qa.objects) {
      expect(
        row.boundary_edges +
          row.non_manifold_edges +
          row.degenerate_faces +
          row.invalid_coordinates,
        row.name,
      ).toBe(0);
      expect(row.volume, row.name).toBeGreaterThan(0);
    }
    expect(
      qa.surface_attachments.every(
        (row: { misses: number }) => row.misses === 0,
      ),
    ).toBe(true);
    expect(qa.surface_attachments).toHaveLength(11);
  });
  it("loads a bounded coloured PBR model with named animation parts and valid geometry", async () => {
    expect(bytes.length).toBeLessThan(1_700_000);
    const gltf = await asset();
    let triangles = 0,
      meshes = 0;
    gltf.scene.traverse((node) => {
      if (node instanceof Mesh) {
        meshes++;
        const p = node.geometry.getAttribute("position");
        expect(node.geometry.getAttribute("color")).toBeDefined();
        expect(node.geometry.getAttribute("normal").count).toBe(p.count);
        expect(Array.from(p.array).every(Number.isFinite)).toBe(true);
        triangles += (node.geometry.index?.count ?? p.count) / 3;
      }
    });
    expect(meshes).toBe(25);
    expect(triangles).toBeGreaterThan(20000);
    expect(triangles).toBeLessThan(45000);
    const box = new Box3().setFromObject(gltf.scene),
      size = box.getSize(new Vector3());
    expect(box.min.y).toBeCloseTo(0, 4);
    expect(size.y).toBeGreaterThan(2.1);
    expect(size.y).toBeLessThan(2.7);
    expect(size.x).toBeLessThan(2.5);
    for (const name of [
      "pikachu-pose",
      "pikachu-head",
      "pikachu-waving-paw",
      "pikachu-tail",
      "pikachu-eyes",
      "pikachu-ear--1",
      "pikachu-ear-1",
    ])
      expect(gltf.scene.getObjectByName(name), name).toBeDefined();
  });
  it("keeps a short wave, blink and ear motion bounded and resets quiet mode without moving another clone", async () => {
    const source = await asset(),
      a = prepareClayPartner(source.scene, "pikachu"),
      b = prepareClayPartner(source.scene, "pikachu");
    try {
      for (const reaction of ["correct", "incorrect", "hinted", "thinking"])
        for (let age = 0; age <= 1.2; age += 0.1) {
          applyCompanionPose(a, "pikachu", {
            time: 2,
            age,
            paused: false,
            idle: true,
            reaction,
          });
          const box = new Box3().setFromObject(a.root),
            size = box.getSize(new Vector3());
          expect(size.y).toBeLessThan(2.7);
          expect(size.x).toBeLessThan(2.8);
          expect(box.min.y).toBeGreaterThan(-0.05);
        }
      applyCompanionPose(a, "pikachu", {
        time: 0.08,
        age: 0.45,
        paused: false,
        idle: true,
        reaction: "correct",
      });
      expect(a.eyes.scale.y).toBeLessThan(1);
      expect(b.eyes.scale.y).toBe(1);
      expect(a.arm.rotation.z).toBeGreaterThan(b.arm.rotation.z);
      applyCompanionPose(a, "pikachu", {
        time: 2,
        age: 0.45,
        paused: true,
        idle: true,
        reaction: "correct",
      });
      expect(a.arm.rotation.z).toBe(0.35);
      expect(a.eyes.scale.y).toBe(1);
      expect(a.body.position.y).toBe(0);
      expect(a.root.getObjectByName("pikachu-ear-1")!.rotation.z).toBe(-0.32);
      for (const time of [3, 7, 11]) {
        applyCompanionPose(a, "pikachu", {
          time,
          age: 5,
          paused: false,
          idle: true,
          reaction: "thinking",
        });
        expect(new Box3().setFromObject(a.root).min.y).toBeGreaterThanOrEqual(
          -0.000001,
        );
      }
      const mesh = source.scene.getObjectByName("pikachu-round-head") as Mesh;
      let disposed = 0;
      mesh.geometry.addEventListener("dispose", () => disposed++);
      a.dispose();
      expect(disposed).toBe(0);
    } finally {
      b.dispose();
    }
  });
  it("also gives the procedural loading model a finite attached face and bounded footprint", () => {
    const model = createPikachuModel();
    try {
      model.root.traverse((node) => {
        if (node instanceof Mesh)
          expect(
            Array.from(node.geometry.getAttribute("position").array).every(
              Number.isFinite,
            ),
          ).toBe(true);
      });
      const size = new Box3().setFromObject(model.root).getSize(new Vector3());
      expect(size.y).toBeLessThan(2.7);
      expect(size.x).toBeLessThan(2.5);
    } finally {
      model.dispose();
    }
  });
  it("keeps both companions and Pikachu's back identifiable in 2D without a canvas", () => {
    for (const companion of companions) {
      const html = renderToStaticMarkup(
        createElement(
          "svg",
          null,
          createElement(CompanionSticker, { kind: companion.id }),
        ),
      );
      expect(html).not.toContain("<canvas");
      expect(html).toContain("<path");
    }
    const back = renderToStaticMarkup(
      createElement(
        "svg",
        null,
        createElement(CompanionSticker, { kind: "pikachu", turned: true }),
      ),
    );
    expect(back).toContain('data-view="back"');
    expect(back).toContain("#a67446");
  });
  it("keeps partner choice collapsed and shows the actual selected partner in the summary", () => {
    const html = renderToStaticMarkup(
      createElement(CompanionPicker, {
        childId: "child-one",
        current: "pikachu",
        onSaved: () => {},
        onNeedProfile: () => {},
      }),
    );
    expect(html).toContain("现在是皮卡丘");
    expect(html).not.toContain('type="radio"');
    expect(html).not.toContain("<canvas");
  });
});
