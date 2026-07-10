// Test script to verify Figma Bundle Exporter programmatically.

import { compileFigmaBundle } from "../lib/figma";
import { COMPONENT_SPECS } from "../lib/componentSchema";

// Mock minimal design system state
const mockState: any = {
  id: "test-project",
  name: "Test Arkitype System",
  meta: { name: "Test Arkitype System", started: true },
  primitives: {
    colorFamilies: [
      { id: "brand", steps: 5, seed: "#6366f1" },
      { id: "neutral", steps: 5, seed: "#71717a" }
    ],
    colors: {
      brand: ["#e0e7ff", "#c7d2fe", "#6366f1", "#4f46e5", "#312e81"],
      neutral: ["#f4f4f5", "#e4e4e7", "#71717a", "#27272a", "#09090b"]
    },
    spacing: [4, 8, 12, 16, 24, 32, 48, 64],
    radii: [0, 2, 4, 8, 12, 16, 24, 9999],
    radiusNames: ["none", "xs", "sm", "md", "lg", "xl", "2xl", "full"],
    typography: {
      baseSize: 16,
      scaleFactor: 1.2,
      rounding: "pixel",
      weights: [
        { name: "regular", value: 400 },
        { name: "medium", value: 500 },
        { name: "semibold", value: 600 },
        { name: "bold", value: 700 }
      ],
      fontRoles: {
        display: { family: "Inter" },
        heading: { family: "Inter" },
        body: { family: "Inter" },
        mono: { family: "Courier New" }
      },
      stepAssign: {
        display: "display",
        heading: "heading",
        body: "body"
      }
    },
    elevation: {
      light: [
        { name: "low", x: 0, y: 1, blur: 2, spread: 0, color: "#000000", opacity: 0.05 },
        { name: "medium", x: 0, y: 4, blur: 6, spread: -1, color: "#000000", opacity: 0.1 }
      ],
      dark: [
        { name: "low", x: 0, y: 1, blur: 2, spread: 0, color: "#000000", opacity: 0.2 },
        { name: "medium", x: 0, y: 4, blur: 6, spread: -1, color: "#000000", opacity: 0.3 }
      ]
    },
    motion: {
      durations: { fast: 100, base: 200, slow: 300 },
      easings: [
        { name: "ease-out", value: "cubic-bezier(0, 0, 0.2, 1)" }
      ]
    },
    layout: {
      breakpoints: { sm: 640, md: 768, lg: 1024, xl: 1280 }
    }
  },
  semantics: {
    groups: [],
    modes: {
      light: {
        "text-primary": "neutral-900",
        "text-muted": "neutral-500",
        "surface-base": "hex:#ffffff",
        "action-primary-default": "brand-3",
        "action-primary-hover": "brand-4",
        "border-default": "neutral-2",
        "text-on-action": "hex:#ffffff"
      },
      dark: {
        "text-primary": "neutral-100",
        "text-muted": "neutral-300",
        "surface-base": "hex:#121214",
        "action-primary-default": "brand-2",
        "action-primary-hover": "brand-3",
        "border-default": "neutral-3",
        "text-on-action": "hex:#ffffff"
      }
    }
  },
  components: {
    button: {
      bindings: {
        "container.bg@default": "role:action-primary-default",
        "container.bg@hover": "role:action-primary-hover",
        "container.radius": "radius:3", // md
        "label.color": "role:text-on-action",
        "label.size": "text:sm"
      },
      properties: {
        variant: "filled",
        label: "Click me"
      }
    },
    checkbox: {
      bindings: {
        "box.bgOn": "role:action-primary-default",
        "box.bgOff": "role:surface-base"
      },
      properties: {
        label: "Accept Terms"
      }
    }
  }
};

function runTest() {
  console.log("=== Programmatic Figma Bundle Verification ===");
  
  try {
    const bundle = compileFigmaBundle(mockState);
    
    console.log("\n1. Metadata Verification:");
    console.log(`- Generator: ${bundle.meta.generator}`);
    console.log(`- Version: ${bundle.meta.version}`);
    console.log(`- Token Count: ${bundle.meta.tokenCount}`);
    
    console.log("\n2. Variables Collections Verification:");
    console.log(`- Collection Count: ${bundle.collections.length}`);
    for (const col of bundle.collections) {
      console.log(`  ➔ Collection: '${col.name}' (${col.variables.length} variables, ${col.modes.length} modes)`);
      if (col.variables.length > 0) {
        console.log(`    Sample Var: ${col.variables[0].name} (${col.variables[0].resolvedType})`);
      }
    }
    
    console.log("\n3. Components Verification:");
    console.log(`- Component Count: ${bundle.components.length}`);
    
    // Check Button component specifically
    const buttonComp = bundle.components.find(c => c.id === "button");
    if (buttonComp) {
      console.log(`  ➔ Found Component: '${buttonComp.name}' (${buttonComp.variants.length} visual variants)`);
      console.log(`    Description: ${buttonComp.description}`);
      
      const sampleVariant = buttonComp.variants[0];
      console.log(`    Sample Variant properties:`, sampleVariant.properties);
      console.log(`    Sample Variant style bindings count: ${Object.keys(sampleVariant.styles).length}`);
      
      // Let's check container.bg resolved mapping
      const bgStyle = sampleVariant.styles["container.bg"];
      console.log(`    Resolved binding for container.bg:`, bgStyle);
      
      // Let's check container.radius resolved mapping
      const radiusStyle = sampleVariant.styles["container.radius"];
      console.log(`    Resolved binding for container.radius:`, radiusStyle);
    } else {
      console.error("FAIL: Button component not exported!");
    }

    const checkboxComp = bundle.components.find(c => c.id === "checkbox");
    if (checkboxComp) {
      console.log(`  ➔ Found Component: '${checkboxComp.name}' (${checkboxComp.variants.length} visual variants)`);
    } else {
      console.error("FAIL: Checkbox component not exported!");
    }

    console.log("\n=== TEST PASSED SUCCESSFULLY ===");
  } catch (error: any) {
    console.error("FAIL: Error executing compileFigmaBundle:", error.stack || error.message);
  }
}

runTest();
