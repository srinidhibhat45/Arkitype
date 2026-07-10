const VALUE_MODE = "mode:value";
const LIGHT_MODE = "mode:light";
const DARK_MODE = "mode:dark";

// Helper: Log message back to the UI iframe
function log(text: string, level: 'info' | 'success' | 'warning' | 'error' = 'info') {
  figma.ui.postMessage({ type: 'log', text, level });
}

// Helper: Report sync status to UI
function updateStatusInUi() {
  const collections = figma.variables.getLocalVariableCollections();
  const primitives = collections.find(c => c.name === "Arkitype / Primitives");
  const semantics = collections.find(c => c.name === "Arkitype / Semantics");
  
  if (primitives && semantics) {
    const vars = figma.variables.getLocalVariables();
    const count = vars.filter(v => 
      v.variableCollectionId === primitives.id || 
      v.variableCollectionId === semantics.id
    ).length;
    
    // Find component sets in the current page
    const componentSets = figma.currentPage.findAll(node => node.type === "COMPONENT_SET" || (node.type === "COMPONENT" && node.name.startsWith("Arkitype / ")));
    
    figma.ui.postMessage({
      type: 'schema-status',
      detected: true,
      projectName: "Arkitype System",
      tokenCount: count,
      componentCount: componentSets.length
    });
  } else {
    figma.ui.postMessage({
      type: 'schema-status',
      detected: false
    });
  }
}

// Show UI with larger comfortable default box size
figma.showUI(__html__, { width: 540, height: 680 });
updateStatusInUi();

// Messaging event handler
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'check-current-file') {
    updateStatusInUi();
  } else if (msg.type === 'sync-variables') {
    try {
      await syncVariables(msg.payload);
      figma.ui.postMessage({
        type: 'sync-complete',
        success: true,
        message: 'Variables successfully synchronized in Figma!'
      });
      updateStatusInUi();
    } catch (e: any) {
      log(`Error syncing variables: ${e.message}`, 'error');
      figma.ui.postMessage({
        type: 'sync-complete',
        success: false,
        message: `Sync failed: ${e.message}`
      });
    }
  } else if (msg.type === 'generate-components') {
    try {
      await syncVariables(msg.payload); // Make sure variables are sync'd first
      await generateComponentLibrary(msg.payload);
      figma.ui.postMessage({
        type: 'sync-complete',
        success: true,
        message: 'Component library generated and synced successfully!'
      });
      updateStatusInUi();
    } catch (e: any) {
      log(`Error generating components: ${e.message}`, 'error');
      figma.ui.postMessage({
        type: 'sync-complete',
        success: false,
        message: `Generation failed: ${e.message}`
      });
    }
  }
};

// Variable Sync Engine
async function syncVariables(bundle: any) {
  log("Starting variable synchronization...", "info");
  
  const localCollections = figma.variables.getLocalVariableCollections();
  
  // 1. Get or Create Primitives Collection
  let primitivesColl = localCollections.find(c => c.name === "Arkitype / Primitives");
  if (!primitivesColl) {
    primitivesColl = figma.variables.createVariableCollection("Arkitype / Primitives");
    log("Created collection 'Arkitype / Primitives'", "success");
  }
  
  // Primitives has single mode "Value"
  const primModeName = "Value";
  const primModes = primitivesColl.modes;
  const primModeId = primModes[0].modeId;
  if (primModes[0].name !== primModeName) {
    primitivesColl.renameMode(primModeId, primModeName);
  }

  // 2. Get or Create Semantics Collection
  let semanticsColl = localCollections.find(c => c.name === "Arkitype / Semantics");
  if (!semanticsColl) {
    semanticsColl = figma.variables.createVariableCollection("Arkitype / Semantics");
    log("Created collection 'Arkitype / Semantics'", "success");
  }

  // Semantics has "Light" and "Dark" modes
  let lightModeId = "";
  let darkModeId = "";
  
  // Align modes in Semantics robustly
  const semModes = semanticsColl.modes;
  if (semModes.length === 1) {
    semanticsColl.renameMode(semModes[0].modeId, "Light");
    lightModeId = semModes[0].modeId;
    darkModeId = semanticsColl.addMode("Dark");
    log("Aligned Semantics collection to Light/Dark modes", "info");
  } else {
    // Check if we have light/dark modes
    const lightMode = semModes.find(m => m.name.toLowerCase().includes("light"));
    const darkMode = semModes.find(m => m.name.toLowerCase().includes("dark"));
    
    if (lightMode) {
      lightModeId = lightMode.modeId;
      if (lightMode.name !== "Light") semanticsColl.renameMode(lightModeId, "Light");
    } else {
      lightModeId = semModes[0].modeId;
      semanticsColl.renameMode(lightModeId, "Light");
    }
    
    if (darkMode) {
      darkModeId = darkMode.modeId;
      if (darkMode.name !== "Dark") semanticsColl.renameMode(darkModeId, "Dark");
    } else {
      darkModeId = semModes[1].modeId;
      semanticsColl.renameMode(darkModeId, "Dark");
    }
  }

  const allFigmaVars = figma.variables.getLocalVariables();
  const variableMap = new Map<string, Variable>(); // maps "CollectionName/path" -> Variable object

  // 3. Pass 1: Create all variables and set literal values
  log("Pass 1: Creating variables and writing literal values...", "info");
  const bundleCollections = bundle.collections;
  
  for (const bundleColl of bundleCollections) {
    const isSemantics = bundleColl.name.includes("Semantics");
    const targetColl = isSemantics ? semanticsColl : primitivesColl;
    
    for (const bundleVar of bundleVarArray(bundleColl)) {
      const varName = bundleVar.name;
      const type = bundleVar.resolvedType;
      
      // Check if variable exists
      let figmaVar = allFigmaVars.find(v => 
        v.variableCollectionId === targetColl.id && v.name === varName
      );
      
      if (!figmaVar) {
        figmaVar = figma.variables.createVariable(varName, targetColl.id, type);
      }
      
      variableMap.set(`${isSemantics ? "Semantics" : "Primitives"}/${varName}`, figmaVar);

      // Set literal values for each mode
      for (const [modeKey, modeVal] of Object.entries(bundleVar.valuesByMode)) {
        let figmaModeId = isSemantics ? (modeKey === DARK_MODE ? darkModeId : lightModeId) : primModeId;
        
        // Skip alias bindings in first pass
        if (modeVal && typeof modeVal === "object" && (modeVal as any).type === "VARIABLE_ALIAS") {
          continue;
        }
        
        // Write literal value
        try {
          if (type === "COLOR" && typeof modeVal === "object") {
            figmaVar.setValueForMode(figmaModeId, modeVal as RGBA);
          } else {
            figmaVar.setValueForMode(figmaModeId, modeVal as any);
          }
        } catch (err: any) {
          log(`Error setting value for ${varName}: ${err.message}`, "warning");
        }
      }
    }
  }

  // 4. Pass 2: Resolve aliases
  log("Pass 2: Linking alias variable references...", "info");
  for (const bundleColl of bundleCollections) {
    const isSemantics = bundleColl.name.includes("Semantics");
    
    for (const bundleVar of bundleVarArray(bundleColl)) {
      const varName = bundleVar.name;
      const figmaVar = variableMap.get(`${isSemantics ? "Semantics" : "Primitives"}/${varName}`);
      if (!figmaVar) continue;
      
      for (const [modeKey, modeVal] of Object.entries(bundleVar.valuesByMode)) {
        let figmaModeId = isSemantics ? (modeKey === DARK_MODE ? darkModeId : lightModeId) : primModeId;
        
        if (modeVal && typeof modeVal === "object" && (modeVal as any).type === "VARIABLE_ALIAS") {
          const aliasVal = modeVal as any;
          const targetVar = variableMap.get(`Primitives/${aliasVal.id}`);
          if (targetVar) {
            try {
              const alias = figma.variables.createVariableAlias(targetVar);
              figmaVar.setValueForMode(figmaModeId, alias);
            } catch (err: any) {
              log(`Failed to bind alias ${varName} -> ${aliasVal.id}: ${err.message}`, "warning");
            }
          }
        }
      }
    }
  }
  
  log(`Synced ${variableMap.size} variables successfully.`, "success");
}

function bundleVarArray(bundleColl: any): any[] {
  return bundleColl.variables || [];
}

// Component Layout & Draw Engine
async function generateComponentLibrary(bundle: any) {
  const components = bundle.components;
  if (!components || components.length === 0) {
    log("No components found in design system bundle.", "warning");
    return;
  }

  log(`Generating libraries for ${components.length} components...`, "info");
  await loadStandardFonts();
  
  // Create a separate layout frame on the current page to organize components
  let mainFrameName = "Arkitype Component Library";
  let mainFrame = figma.currentPage.findOne(node => node.type === "FRAME" && node.name === mainFrameName) as FrameNode;
  if (!mainFrame) {
    mainFrame = figma.createFrame();
    mainFrame.name = mainFrameName;
    mainFrame.layoutMode = "VERTICAL";
    mainFrame.itemSpacing = 96;
    mainFrame.paddingTop = 64;
    mainFrame.paddingBottom = 64;
    mainFrame.paddingLeft = 64;
    mainFrame.paddingRight = 64;
    mainFrame.primaryAxisSizingMode = "AUTO";
    mainFrame.counterAxisSizingMode = "AUTO";
    mainFrame.fills = [{ type: 'SOLID', color: { r: 0.07, g: 0.07, b: 0.08 } }]; // matching dark bg
    log("Created library container canvas frame.", "info");
  } else {
    figma.currentPage.appendChild(mainFrame);
  }

  const collections = figma.variables.getLocalVariableCollections();
  const primitivesColl = collections.find(c => c.name === "Arkitype / Primitives")!;
  const semanticsColl = collections.find(c => c.name === "Arkitype / Semantics")!;
  
  const allLocalVars = figma.variables.getLocalVariables();
  const figmaVarsMap = new Map<string, Variable>(); // maps "CollectionName/path" -> Variable
  allLocalVars.forEach(v => {
    const colName = v.variableCollectionId === primitivesColl.id ? "Primitives" : "Semantics";
    figmaVarsMap.set(`${colName}/${v.name}`, v);
  });

  // Loop through components resiliently (wrap each component in its own try/catch)
  for (const comp of components) {
    try {
      log(`Syncing component '${comp.name}'...`, "info");
      
      const componentSetName = `Arkitype / ${comp.name}`;
      
      // Look for existing component or component set
      let compSet: ComponentSetNode | null = null;
      let compNode: ComponentNode | null = null;
      
      const existingNode = figma.currentPage.findOne(node => 
        (node.type === "COMPONENT_SET" || node.type === "COMPONENT") && node.name === componentSetName
      );
      
      if (existingNode) {
        if (existingNode.type === "COMPONENT_SET") {
          compSet = existingNode as ComponentSetNode;
        } else {
          compNode = existingNode as ComponentNode;
        }
      }
      
      let compSetContainer: FrameNode;
      let isNewSet = (!compSet && !compNode);

      if (isNewSet) {
        compSetContainer = figma.createFrame();
        compSetContainer.name = `${comp.name} Container`;
        compSetContainer.layoutMode = "HORIZONTAL";
        compSetContainer.itemSpacing = 40;
        compSetContainer.fills = [];
        compSetContainer.primaryAxisSizingMode = "AUTO";
        compSetContainer.counterAxisSizingMode = "AUTO";
        mainFrame.appendChild(compSetContainer);
      } else {
        const foundParent = (compSet || compNode)!.parent as FrameNode;
        if (foundParent && foundParent.type === "FRAME") {
          compSetContainer = foundParent;
        } else {
          compSetContainer = figma.createFrame();
          compSetContainer.name = `${comp.name} Container`;
          compSetContainer.layoutMode = "HORIZONTAL";
          compSetContainer.itemSpacing = 40;
          compSetContainer.fills = [];
          compSetContainer.primaryAxisSizingMode = "AUTO";
          compSetContainer.counterAxisSizingMode = "AUTO";
          mainFrame.appendChild(compSetContainer);
          compSetContainer.appendChild((compSet || compNode)!);
        }
      }

      // Build the variants
      const variantNodes: ComponentNode[] = [];
      
      const states = Array.from(new Set(comp.variants.map((v: any) => v.properties.state || "default"))) as string[];
      const nonStates = Object.keys(comp.variants[0].properties).filter(k => k !== "state");
      
      const optionsCombinations = Array.from(new Set(comp.variants.map((v: any) => {
        return nonStates.map(k => `${k}=${v.properties[k]}`).join(",");
      }))) as string[];

      // Position each variant component node in a clean, generous visual grid to prevent overlaps:
      let cellWidth = 240;
      let cellHeight = 100;
      
      if (comp.id === "modal" || comp.id === "card" || comp.id === "table" || comp.id === "navbar" || comp.id === "emptyState") {
        cellWidth = 380;
        cellHeight = 280;
      } else if (comp.id === "sidebar") {
        cellWidth = 240;
        cellHeight = 300;
      } else if (comp.id === "alert" || comp.id === "toast" || comp.id === "banner" || comp.id === "listItem" || comp.id === "feedItem" || comp.id === "input" || comp.id === "textarea" || comp.id === "select" || comp.id === "searchField") {
        cellWidth = 300;
        cellHeight = 120;
      } else if (comp.id === "codeBlock") {
        cellWidth = 280;
        cellHeight = 140;
      }

      for (const variantData of comp.variants) {
        const comboProps = variantData.properties;
        const comboState = comboProps.state || "default";
        const optionComboString = nonStates.map(k => `${k}=${comboProps[k]}`).join(",");
        
        const rowIndex = optionsCombinations.indexOf(optionComboString);
        const colIndex = states.indexOf(comboState);
        const figmaVariantName = Object.entries(comboProps)
          .map(([k, v]) => `${k}=${v}`)
          .join(", ");

        let variantNode: ComponentNode | null = null;
        if (compSet) {
          // Find child inside existing set using variant properties object match (immune to string ordering)
          variantNode = compSet.children.find(child => {
            if (child.type !== "COMPONENT") return false;
            const props = child.variantProperties;
            return props && Object.entries(comboProps).every(([k, v]) => props[k] === v);
          }) as ComponentNode;
        } else if (compNode) {
          variantNode = compNode;
        }

        if (!variantNode) {
          variantNode = figma.createComponent();
          variantNode.name = figmaVariantName;
        }

        // Position in grid
        variantNode.x = colIndex * cellWidth + 40;
        variantNode.y = rowIndex * cellHeight + 40;

        // Draw/Style this variant node
        await drawComponentNode(variantNode, comp.id, variantData, figmaVarsMap);
        variantNodes.push(variantNode);
      }

      let maxVariantWidth = 0;
      let maxVariantHeight = 0;
      for (const node of variantNodes) {
        if (node.width > maxVariantWidth) maxVariantWidth = node.width;
        if (node.height > maxVariantHeight) maxVariantHeight = node.height;
      }
      const gridWidth = (states.length - 1) * cellWidth + maxVariantWidth + 80;
      const gridHeight = (optionsCombinations.length - 1) * cellHeight + maxVariantHeight + 80;

      if (isNewSet) {
        if (variantNodes.length > 1) {
          const tempFrame = figma.createFrame();
          tempFrame.fills = [];
          tempFrame.primaryAxisSizingMode = "AUTO";
          tempFrame.counterAxisSizingMode = "AUTO";
          compSetContainer.appendChild(tempFrame);
          
          variantNodes.forEach(node => tempFrame.appendChild(node));
          
          compSet = figma.combineAsVariants(variantNodes, tempFrame);
          compSet.name = componentSetName;
          compSet.description = comp.description;
          compSet.layoutMode = "NONE"; // let us position variants explicitly
          
          compSet.primaryAxisSizingMode = "AUTO";
          compSet.counterAxisSizingMode = "AUTO";
          compSet.resize(gridWidth, gridHeight);
          
          // Style the component set container box visually
          compSet.strokes = [{ type: "SOLID", color: { r: 0.17, g: 0.17, b: 0.21 } }];
          compSet.strokeWeight = 1;
          compSet.dashPattern = [4, 4];
          compSet.cornerRadius = 8;
          compSet.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.11 } }];
          compSet.paddingTop = 24;
          compSet.paddingBottom = 24;
          compSet.paddingLeft = 24;
          compSet.paddingRight = 24;
          
          log(`Created component set '${componentSetName}'`, "success");
        } else {
          // Single variant: Standalone Component Node wrapped in a visual dashed box
          const singleComp = variantNodes[0];
          singleComp.name = componentSetName;
          singleComp.description = comp.description;
          singleComp.x = 40;
          singleComp.y = 40;
          
          const wrapperFrame = figma.createFrame();
          wrapperFrame.name = `${comp.name} Container`;
          wrapperFrame.layoutMode = "NONE";
          wrapperFrame.resize(maxVariantWidth + 80, maxVariantHeight + 80);
          
          wrapperFrame.strokes = [{ type: "SOLID", color: { r: 0.17, g: 0.17, b: 0.21 } }];
          wrapperFrame.strokeWeight = 1;
          wrapperFrame.dashPattern = [4, 4];
          wrapperFrame.cornerRadius = 8;
          wrapperFrame.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.11 } }];
          
          compSetContainer.appendChild(wrapperFrame);
          wrapperFrame.appendChild(singleComp);
          
          log(`Created single component '${componentSetName}'`, "success");
        }
      } else {
        const activeCompSet = compSet;
        if (activeCompSet) {
          variantNodes.forEach(node => {
            if (node.parent !== activeCompSet) {
              activeCompSet.appendChild(node);
            }
          });
          activeCompSet.resize(gridWidth, gridHeight);
        } else if (compNode) {
          const wrapper = compNode.parent as FrameNode;
          if (wrapper && wrapper.type === "FRAME" && wrapper.name.includes("Container")) {
            wrapper.resize(compNode.width + 80, compNode.height + 80);
          }
        }
        log(`Synced component '${componentSetName}' in-place.`, "success");
      }

      // Generate or update documentation card
      await drawComponentDocsCard(compSetContainer, comp, figmaVarsMap);
    } catch (compErr: any) {
      log(`Error syncing component '${comp.name}': ${compErr.message}`, "error");
    }
  }
}

// Load fonts needed for the TextNodes
async function loadStandardFonts() {
  try {
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    await figma.loadFontAsync({ family: "Inter", style: "Medium" });
    await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
    await figma.loadFontAsync({ family: "Inter", style: "Bold" });
    await figma.loadFontAsync({ family: "Courier New", style: "Regular" });
  } catch (err) {
    log(`Warning loading standard fonts: ${err}`, "warning");
  }
}

// Safely load fonts, catching failure and returning actual loaded font
async function loadFontSafe(family: string, style: string): Promise<{ family: string; style: string }> {
  try {
    await figma.loadFontAsync({ family, style });
    return { family, style };
  } catch (e) {
    try {
      await figma.loadFontAsync({ family: "Inter", style });
      return { family: "Inter", style };
    } catch (e2) {
      await figma.loadFontAsync({ family: "Inter", style: "Regular" });
      return { family: "Inter", style: "Regular" };
    }
  }
}

// Hex converter for Figma {r, g, b} scale (0 to 1)
function hexToFigmaRgb(hex: string): RGB {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex[0] + cleanHex[0] + cleanHex[1] + cleanHex[1] + cleanHex[2] + cleanHex[2];
  }
  
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  
  return { r, g, b };
}

// Helper: Create Text Node
async function createTextHelper(
  parent: FrameNode | ComponentNode,
  name: string,
  characters: string,
  fontSize: number,
  colorBinding: any,
  fontFamily: string = "Inter",
  fontStyle: string = "Regular",
  figmaVarsMap: Map<string, Variable>
): Promise<TextNode> {
  const text = figma.createText();
  text.name = name;
  
  const loadedFont = await loadFontSafe(fontFamily, fontStyle);
  text.fontName = loadedFont;
  text.characters = characters;
  text.fontSize = fontSize;
  
  if (colorBinding) {
    if (colorBinding.type === "ALIAS") {
      const fVar = figmaVarsMap.get(`${colorBinding.collection}/${colorBinding.path}`);
      if (fVar) {
        text.fills = [
          figma.variables.setBoundVariableForPaint(
            { type: 'SOLID', color: { r: 0, g: 0, b: 0 } },
            'color',
            fVar
          )
        ];
      }
    } else if (colorBinding.value) {
      text.fills = [{ type: 'SOLID', color: hexToFigmaRgb(colorBinding.value.toString()) }];
    }
  } else {
    text.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
  }
  
  parent.appendChild(text);
  return text;
}

// Helper: Create Layout Frame
async function createFrameHelper(
  parent: FrameNode | ComponentNode | null,
  name: string,
  layoutMode: "HORIZONTAL" | "VERTICAL" | "NONE",
  itemSpacing: any,
  paddingX: any,
  paddingY: any,
  bgBinding: any,
  borderBinding: any,
  borderWidth: number,
  radiusBinding: any,
  figmaVarsMap: Map<string, Variable>
): Promise<FrameNode> {
  const frame = figma.createFrame();
  frame.name = name;
  frame.layoutMode = layoutMode;
  
  if (layoutMode !== "NONE") {
    frame.primaryAxisSizingMode = "AUTO";
    frame.counterAxisSizingMode = "AUTO";
    frame.primaryAxisAlignItems = "CENTER";
    frame.counterAxisAlignItems = "CENTER";
    
    // Spacing
    if (itemSpacing !== undefined && itemSpacing !== null) {
      if (typeof itemSpacing === "object" && itemSpacing.type === "ALIAS") {
        const fVar = figmaVarsMap.get(`${itemSpacing.collection}/${itemSpacing.path}`);
        if (fVar) frame.setBoundVariable('itemSpacing', fVar);
      } else {
        frame.itemSpacing = Number(itemSpacing) || 0;
      }
    }
    
    // Padding
    if (paddingX !== undefined && paddingX !== null) {
      if (typeof paddingX === "object" && paddingX.type === "ALIAS") {
        const fVar = figmaVarsMap.get(`${paddingX.collection}/${paddingX.path}`);
        if (fVar) {
          frame.setBoundVariable('paddingLeft', fVar);
          frame.setBoundVariable('paddingRight', fVar);
        }
      } else {
        frame.paddingLeft = Number(paddingX) || 0;
        frame.paddingRight = Number(paddingX) || 0;
      }
    }
    
    if (paddingY !== undefined && paddingY !== null) {
      if (typeof paddingY === "object" && paddingY.type === "ALIAS") {
        const fVar = figmaVarsMap.get(`${paddingY.collection}/${paddingY.path}`);
        if (fVar) {
          frame.setBoundVariable('paddingTop', fVar);
          frame.setBoundVariable('paddingBottom', fVar);
        }
      } else {
        frame.paddingTop = Number(paddingY) || 0;
        frame.paddingBottom = Number(paddingY) || 0;
      }
    }
  }
  
  // Background
  if (bgBinding) {
    if (bgBinding.type === "ALIAS") {
      const fVar = figmaVarsMap.get(`${bgBinding.collection}/${bgBinding.path}`);
      if (fVar) {
        frame.fills = [
          figma.variables.setBoundVariableForPaint(
            { type: 'SOLID', color: { r: 0, g: 0, b: 0 } },
            'color',
            fVar
          )
        ];
      }
    } else if (bgBinding.value && bgBinding.value !== "transparent") {
      frame.fills = [{ type: 'SOLID', color: hexToFigmaRgb(bgBinding.value.toString()) }];
    } else {
      frame.fills = [];
    }
  } else {
    frame.fills = [];
  }
  
  // Border
  if (borderBinding) {
    if (borderBinding.type === "ALIAS") {
      const fVar = figmaVarsMap.get(`${borderBinding.collection}/${borderBinding.path}`);
      if (fVar) {
        frame.strokes = [
          figma.variables.setBoundVariableForPaint(
            { type: 'SOLID', color: { r: 0, g: 0, b: 0 } },
            'color',
            fVar
          )
        ];
        frame.strokeWeight = borderWidth || 1;
      }
    } else if (borderBinding.value && borderBinding.value !== "transparent") {
      frame.strokes = [{ type: 'SOLID', color: hexToFigmaRgb(borderBinding.value.toString()) }];
      frame.strokeWeight = borderWidth || 1;
    } else {
      frame.strokes = [];
    }
  } else {
    frame.strokes = [];
  }
  
  // Radius
  if (radiusBinding) {
    if (radiusBinding.type === "ALIAS") {
      const fVar = figmaVarsMap.get(`${radiusBinding.collection}/${radiusBinding.path}`);
      if (fVar) {
        frame.setBoundVariable('topLeftRadius', fVar);
        frame.setBoundVariable('topRightRadius', fVar);
        frame.setBoundVariable('bottomLeftRadius', fVar);
        frame.setBoundVariable('bottomRightRadius', fVar);
      }
    } else if (radiusBinding.value !== undefined) {
      frame.cornerRadius = Number(radiusBinding.value) || 0;
    }
  }
  
  if (parent) parent.appendChild(frame);
  return frame;
}

// Function to draw/style a component node
async function drawComponentNode(
  node: ComponentNode,
  componentId: string,
  variantData: any,
  figmaVarsMap: Map<string, Variable>
) {
  const styles = variantData.styles;
  const options = variantData.options;
  const state = variantData.properties.state || "default";

  // Setup Base Auto Layout on the root component node
  node.layoutMode = "HORIZONTAL";
  node.primaryAxisAlignItems = "CENTER";
  node.counterAxisAlignItems = "CENTER";
  node.primaryAxisSizingMode = "AUTO";
  node.counterAxisSizingMode = "AUTO";
  
  // Defensive: Clear any inherited stroke dash patterns
  try {
    node.dashPattern = [];
  } catch (e) {}

  // Apply root padding, radius, background, border
  const bgBinding = styles["container.bg"];
  if (bgBinding) {
    if (bgBinding.type === "ALIAS") {
      const fVar = figmaVarsMap.get(`${bgBinding.collection}/${bgBinding.path}`);
      if (fVar) {
        node.fills = [
          figma.variables.setBoundVariableForPaint(
            { type: 'SOLID', color: { r: 0, g: 0, b: 0 } },
            'color',
            fVar
          )
        ];
      }
    } else if (bgBinding.value && bgBinding.value !== "transparent") {
      node.fills = [{ type: 'SOLID', color: hexToFigmaRgb(bgBinding.value.toString()) }];
    } else {
      node.fills = [];
    }
  } else {
    node.fills = [];
  }

  const borderBinding = styles["container.border"];
  const borderWidthBinding = styles["container.borderWidth"];
  const borderWidth = borderWidthBinding ? Number(borderWidthBinding.value) || 1 : 1;

  if (borderBinding) {
    if (borderBinding.type === "ALIAS") {
      const fVar = figmaVarsMap.get(`${borderBinding.collection}/${borderBinding.path}`);
      if (fVar) {
        node.strokes = [
          figma.variables.setBoundVariableForPaint(
            { type: 'SOLID', color: { r: 0, g: 0, b: 0 } },
            'color',
            fVar
          )
        ];
        node.strokeWeight = borderWidth;
      }
    } else if (borderBinding.value && borderBinding.value !== "transparent") {
      node.strokes = [{ type: 'SOLID', color: hexToFigmaRgb(borderBinding.value.toString()) }];
      node.strokeWeight = borderWidth;
    } else {
      node.strokes = [];
    }
  } else {
    node.strokes = [];
  }

  const radiusBinding = styles["container.radius"];
  if (radiusBinding && radiusBinding.type === "ALIAS") {
    const fVar = figmaVarsMap.get(`${radiusBinding.collection}/${radiusBinding.path}`);
    if (fVar) {
      node.setBoundVariable('topLeftRadius', fVar);
      node.setBoundVariable('topRightRadius', fVar);
      node.setBoundVariable('bottomLeftRadius', fVar);
      node.setBoundVariable('bottomRightRadius', fVar);
    }
  } else if (radiusBinding && radiusBinding.value !== undefined) {
    node.cornerRadius = Number(radiusBinding.value) || 0;
  }

  const padXBinding = styles["container.padX"];
  if (padXBinding && padXBinding.type === "ALIAS") {
    const fVar = figmaVarsMap.get(`${padXBinding.collection}/${padXBinding.path}`);
    if (fVar) {
      node.setBoundVariable('paddingLeft', fVar);
      node.setBoundVariable('paddingRight', fVar);
    }
  } else if (padXBinding && padXBinding.value !== undefined) {
    node.paddingLeft = Number(padXBinding.value) || 0;
    node.paddingRight = Number(padXBinding.value) || 0;
  }

  const padYBinding = styles["container.padY"];
  if (padYBinding && padYBinding.type === "ALIAS") {
    const fVar = figmaVarsMap.get(`${padYBinding.collection}/${padYBinding.path}`);
    if (fVar) {
      node.setBoundVariable('paddingTop', fVar);
      node.setBoundVariable('paddingBottom', fVar);
    }
  } else if (padYBinding && padYBinding.value !== undefined) {
    node.paddingTop = Number(padYBinding.value) || 0;
    node.paddingBottom = Number(padYBinding.value) || 0;
  }

  // Clear existing children for redraw
  [...node.children].forEach(c => c.remove());

  // Render Component Specific Nodes
  switch (componentId) {
    case "button":
    case "iconButton":
      await drawButton(node, styles, options, componentId, figmaVarsMap);
      break;
    case "checkbox":
    case "radio":
      await drawSelectionControl(node, styles, options, componentId, state, variantData.properties, figmaVarsMap);
      break;
    case "switch":
      await drawSwitchControl(node, styles, options, state, variantData.properties, figmaVarsMap);
      break;
    case "input":
    case "textarea":
    case "select":
    case "searchField":
      await drawFormControl(node, styles, options, componentId, state, figmaVarsMap);
      break;
    case "badge":
    case "tag":
      await drawBadgeTag(node, styles, options, componentId, figmaVarsMap);
      break;
    case "avatar":
      await drawAvatar(node, styles, options, figmaVarsMap);
      break;
    case "tooltip":
      await drawTooltip(node, styles, options, figmaVarsMap);
      break;
    case "progress":
    case "slider":
      await drawProgressSlider(node, styles, options, componentId, figmaVarsMap);
      break;
    case "divider":
      await drawDivider(node, styles, figmaVarsMap);
      break;
    case "alert":
    case "toast":
    case "banner":
      await drawAlertToastBanner(node, styles, options, componentId, figmaVarsMap);
      break;
    case "card":
    case "modal":
      await drawCardModal(node, styles, options, componentId, figmaVarsMap);
      break;
    case "tabs":
    case "accordion":
    case "dropdown":
      await drawInteractiveNavigation(node, styles, options, componentId, figmaVarsMap);
      break;
    case "table":
      await drawTable(node, styles, options, figmaVarsMap);
      break;
    case "navbar":
    case "sidebar":
      await drawNavbarSidebar(node, styles, options, componentId, figmaVarsMap);
      break;
    case "breadcrumbs":
    case "steps":
    case "pagination":
      await drawNavigationLanes(node, styles, options, componentId, figmaVarsMap);
      break;
    case "link":
      await drawLink(node, styles, options, figmaVarsMap);
      break;
    case "listItem":
    case "feedItem":
      await drawListFeedItems(node, styles, options, componentId, figmaVarsMap);
      break;
    case "emptyState":
    case "codeBlock":
      await drawComplexDisplays(node, styles, options, componentId, figmaVarsMap);
      break;
    case "stat":
    case "statGrid":
      await drawStats(node, styles, options, componentId, figmaVarsMap);
      break;
    case "stepper":
    case "buttonGroup":
    case "field":
      await drawAdvancedControls(node, styles, options, componentId, state, figmaVarsMap);
      break;
    case "spinner":
    case "skeleton":
    case "kbd":
      await drawStatusIndicators(node, styles, options, componentId, figmaVarsMap);
      break;
    default:
      await drawFallback(node, componentId);
  }
}

// ── SUB-RENDERERS FOR ALL 43 COMPONENTS ──

async function drawButton(node: ComponentNode, styles: any, options: any, componentId: string, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = "HORIZONTAL";
  node.itemSpacing = 8;
  
  if (componentId === "button") {
    // 1. Icon Prefix
    if (options.prefixIcon) {
      const prefix = figma.createFrame();
      prefix.name = "prefixIcon";
      prefix.resize(14, 14);
      prefix.fills = [];
      const dot = figma.createEllipse();
      dot.resize(10, 10);
      dot.x = 2; dot.y = 2;
      
      const iconColor = styles["prefixIcon.color"];
      if (iconColor && iconColor.type === "ALIAS") {
        const fVar = figmaVarsMap.get(`${iconColor.collection}/${iconColor.path}`);
        if (fVar) dot.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', fVar)];
      } else if (iconColor && iconColor.value) {
        dot.fills = [{ type: 'SOLID', color: hexToFigmaRgb(iconColor.value.toString()) }];
      }
      prefix.appendChild(dot);
      node.appendChild(prefix);
    }
    
    // 2. Text Label
    await createTextHelper(node, "label", options.label || "Action Button", 13, styles["label.color"], "Inter", "Semi Bold", figmaVarsMap);

    // 3. Icon Suffix
    if (options.suffixIcon) {
      const suffix = figma.createFrame();
      suffix.name = "suffixIcon";
      suffix.resize(14, 14);
      suffix.fills = [];
      const dot = figma.createEllipse();
      dot.resize(10, 10);
      dot.x = 2; dot.y = 2;
      
      const iconColor = styles["suffixIcon.color"];
      if (iconColor && iconColor.type === "ALIAS") {
        const fVar = figmaVarsMap.get(`${iconColor.collection}/${iconColor.path}`);
        if (fVar) dot.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', fVar)];
      } else if (iconColor && iconColor.value) {
        dot.fills = [{ type: 'SOLID', color: hexToFigmaRgb(iconColor.value.toString()) }];
      }
      suffix.appendChild(dot);
      node.appendChild(suffix);
    }
  } else {
    // IconButton
    const icon = figma.createFrame();
    icon.name = "icon";
    icon.resize(16, 16);
    icon.fills = [];
    const dot = figma.createEllipse();
    dot.resize(12, 12);
    dot.x = 2; dot.y = 2;
    
    const iconColor = styles["icon.color"];
    if (iconColor && iconColor.type === "ALIAS") {
      const fVar = figmaVarsMap.get(`${iconColor.collection}/${iconColor.path}`);
      if (fVar) dot.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', fVar)];
    } else if (iconColor && iconColor.value) {
      dot.fills = [{ type: 'SOLID', color: hexToFigmaRgb(iconColor.value.toString()) }];
    }
    icon.appendChild(dot);
    node.appendChild(icon);
  }
}

async function drawSelectionControl(
  node: ComponentNode, 
  styles: any, 
  options: any, 
  componentId: string, 
  state: string, 
  properties: any,
  figmaVarsMap: Map<string, Variable>
) {
  options = options || {};
  properties = properties || {};
  node.layoutMode = "HORIZONTAL";
  node.itemSpacing = 8;
  node.primaryAxisAlignItems = "MIN";
  
  const checked = properties.checked === "true" || properties.checked === true;
  
  const control = figma.createFrame();
  control.name = "control";
  control.primaryAxisSizingMode = "FIXED";
  control.counterAxisSizingMode = "FIXED";
  control.resize(18, 18);
  control.cornerRadius = componentId === "checkbox" ? 4 : 99;
  
  // Background fill
  const bgKey = checked ? "box.bgOn" : "box.bgOff";
  const bgBinding = styles[bgKey] || styles["dot.bg"] || styles["dot.fill"];
  if (bgBinding && checked) {
    if (bgBinding.type === "ALIAS") {
      const fVar = figmaVarsMap.get(`${bgBinding.collection}/${bgBinding.path}`);
      if (fVar) control.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', fVar)];
    } else if (bgBinding.value) {
      control.fills = [{ type: 'SOLID', color: hexToFigmaRgb(bgBinding.value.toString()) }];
    }
  } else {
    // Off
    control.fills = [{ type: 'SOLID', color: { r: 0.15, g: 0.15, b: 0.18 } }];
  }

  // Border
  if (!checked) {
    const borderBinding = styles["box.borderOff"] || styles["dot.border"];
    if (borderBinding && borderBinding.type === "ALIAS") {
      const fVar = figmaVarsMap.get(`${borderBinding.collection}/${borderBinding.path}`);
      if (fVar) {
        control.strokes = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', fVar)];
        control.strokeWeight = 1.5;
      }
    } else {
      control.strokes = [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.35 } }];
      control.strokeWeight = 1.5;
    }
  }

  // Draw inner mark
  if (checked) {
    control.layoutMode = "HORIZONTAL";
    control.primaryAxisAlignItems = "CENTER";
    control.counterAxisAlignItems = "CENTER";
    
    if (componentId === "checkbox") {
      const check = figma.createVector();
      check.name = "checkmark";
      check.vectorPaths = [{ windingRule: "NONZERO", data: "M 4 8 L 7 11 L 14 4" }];
      check.strokeWeight = 2.5;
      check.strokes = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      control.appendChild(check);
    } else {
      const dot = figma.createEllipse();
      dot.resize(8, 8);
      dot.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      control.appendChild(dot);
    }
  }
  
  node.appendChild(control);

  // Label
  const labelColor = state === "disabled" ? styles["box.borderOff"] : undefined;
  await createTextHelper(node, "label", options.label || "Selection Option", 13, labelColor, "Inter", "Regular", figmaVarsMap);
}

async function drawSwitchControl(
  node: ComponentNode, 
  styles: any, 
  options: any, 
  state: string, 
  properties: any,
  figmaVarsMap: Map<string, Variable>
) {
  options = options || {};
  properties = properties || {};
  node.layoutMode = "HORIZONTAL";
  node.primaryAxisAlignItems = "MIN";

  const checked = properties.checked === "true" || properties.checked === true;
  
  const track = figma.createFrame();
  track.name = "switchTrack";
  track.primaryAxisSizingMode = "FIXED";
  track.counterAxisSizingMode = "FIXED";
  track.resize(36, 20);
  track.cornerRadius = 999;
  
  const trackKey = checked ? "switchTrack.on" : "switchTrack.off";
  const trackBinding = styles[trackKey];
  if (trackBinding && trackBinding.type === "ALIAS") {
    const fVar = figmaVarsMap.get(`${trackBinding.collection}/${trackBinding.path}`);
    if (fVar) track.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', fVar)];
  } else {
    track.fills = [{ type: 'SOLID', color: checked ? { r: 0.38, g: 0.4, b: 0.95 } : { r: 0.2, g: 0.2, b: 0.24 } }];
  }

  const thumb = figma.createFrame();
  thumb.name = "switchThumb";
  thumb.primaryAxisSizingMode = "FIXED";
  thumb.counterAxisSizingMode = "FIXED";
  thumb.resize(14, 14);
  thumb.cornerRadius = 99;
  thumb.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  
  thumb.y = 3;
  thumb.x = checked ? 19 : 3;
  
  track.appendChild(thumb);
  node.appendChild(track);
}

async function drawFormControl(node: ComponentNode, styles: any, options: any, componentId: string, state: string, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = "HORIZONTAL";
  node.primaryAxisAlignItems = "MIN";
  node.itemSpacing = 8;
  
  // Set both to FIXED so size is respected in all parent layout environments
  node.primaryAxisSizingMode = "FIXED";
  node.counterAxisSizingMode = "FIXED";
  node.resize(220, componentId === "textarea" ? 80 : 38);
  
  // Align textarea content to the top left instead of center
  if (componentId === "textarea") {
    node.counterAxisAlignItems = "MIN";
  }

  if (componentId === "searchField") {
    const icon = figma.createFrame();
    icon.name = "searchIcon";
    icon.primaryAxisSizingMode = "FIXED";
    icon.counterAxisSizingMode = "FIXED";
    icon.resize(14, 14);
    icon.fills = [];
    const circle = figma.createEllipse();
    circle.resize(10, 10);
    circle.strokes = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }];
    circle.strokeWeight = 1.5;
    icon.appendChild(circle);
    node.appendChild(icon);
  }

  let placeholderText = options.placeholder || "Enter text...";
  if (componentId === "select") placeholderText = "Select option...";
  if (componentId === "searchField") placeholderText = "Search...";
  
  const labelText = await createTextHelper(node, "text", placeholderText, 13, styles["text.color"], "Inter", "Regular", figmaVarsMap);
  labelText.layoutGrow = 1;

  if (componentId === "select") {
    const icon = figma.createFrame();
    icon.name = "chevronIcon";
    icon.primaryAxisSizingMode = "FIXED";
    icon.counterAxisSizingMode = "FIXED";
    icon.resize(12, 12);
    icon.fills = [];
    const arrow = figma.createVector();
    arrow.vectorPaths = [{ windingRule: "NONZERO", data: "M 2 4 L 6 8 L 10 4" }];
    arrow.strokes = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }];
    arrow.strokeWeight = 1.5;
    icon.appendChild(arrow);
    node.appendChild(icon);
  }
}

async function drawBadgeTag(node: ComponentNode, styles: any, options: any, componentId: string, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = "HORIZONTAL";
  node.itemSpacing = 6;
  
  if (componentId === "badge" && options.dot) {
    const dot = figma.createEllipse();
    dot.name = "statusDot";
    dot.resize(6, 6);
    dot.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.8, b: 0.5 } }];
    node.appendChild(dot);
  }

  await createTextHelper(node, "label", options.label || "Tag", 11, styles["text.color"], "Inter", "Semi Bold", figmaVarsMap);

  if (componentId === "tag" && options.removable) {
    const cross = figma.createVector();
    cross.name = "removeIcon";
    cross.vectorPaths = [{ windingRule: "NONZERO", data: "M 2 2 L 8 8 M 8 2 L 2 8" }];
    cross.strokes = [{ type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6 } }];
    cross.strokeWeight = 1.2;
    node.appendChild(cross);
  }
}

async function drawAvatar(node: ComponentNode, styles: any, options: any, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = "NONE";
  
  const size = options.size === "sm" ? 28 : options.size === "md" ? 36 : 48;
  
  node.primaryAxisSizingMode = "FIXED";
  node.counterAxisSizingMode = "FIXED";
  node.resize(size, size);
  node.cornerRadius = 9999;

  const text = await createTextHelper(node, "initials", options.initials || "JD", size * 0.38, styles["text.color"], "Inter", "Bold", figmaVarsMap);
  text.x = (size - text.width) / 2;
  text.y = (size - text.height) / 2;
  
  if (options.presence && options.presence !== "none") {
    const dot = figma.createEllipse();
    dot.name = "presence";
    const dotSize = Math.max(8, size * 0.22);
    dot.resize(dotSize, dotSize);
    dot.x = size - dotSize;
    dot.y = size - dotSize;
    
    dot.strokes = [{ type: 'SOLID', color: { r: 0.07, g: 0.07, b: 0.08 } }];
    dot.strokeWeight = 1.5;
    
    const presenceColor = options.presence === "online" ? { r: 0.1, g: 0.8, b: 0.4 } : { r: 0.6, g: 0.6, b: 0.6 };
    dot.fills = [{ type: 'SOLID', color: presenceColor }];
    node.appendChild(dot);
  }
}

async function drawTooltip(node: ComponentNode, styles: any, options: any, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = "VERTICAL";
  node.paddingTop = 6;
  node.paddingBottom = 6;
  node.paddingLeft = 10;
  node.paddingRight = 10;
  
  await createTextHelper(node, "text", options.label || "Tooltip description text", 11, styles["text.color"], "Inter", "Regular", figmaVarsMap);
}

async function drawProgressSlider(node: ComponentNode, styles: any, options: any, componentId: string, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = "VERTICAL";
  node.itemSpacing = 8;
  
  node.primaryAxisSizingMode = "FIXED";
  node.resize(160, node.height);
  
  const track = await createFrameHelper(node, "track", "HORIZONTAL", 0, 0, 0, styles["track.bg"], null, 0, styles["track.radius"], figmaVarsMap);
  track.primaryAxisSizingMode = "FIXED";
  track.counterAxisSizingMode = "FIXED";
  track.resize(160, 6);
  
  const fill = await createFrameHelper(track, "fill", "NONE", 0, 0, 0, styles["fill.bg"], null, 0, null, figmaVarsMap);
  fill.resize(96, 6);
  
  if (componentId === "slider") {
    const thumb = await createFrameHelper(track, "thumb", "NONE", 0, 0, 0, styles["thumb.bg"], styles["thumb.border"], 1.5, null, figmaVarsMap);
    thumb.primaryAxisSizingMode = "FIXED";
    thumb.counterAxisSizingMode = "FIXED";
    thumb.resize(14, 14);
    thumb.cornerRadius = 99;
    thumb.x = 89;
    thumb.y = -4;
  }
}

async function drawDivider(node: ComponentNode, styles: any, figmaVarsMap: Map<string, Variable>) {
  node.layoutMode = "HORIZONTAL";
  node.primaryAxisSizingMode = "FIXED";
  node.counterAxisSizingMode = "FIXED";
  node.resize(180, 1);
  node.fills = [];
  
  const border = styles["container.border"] || styles["divider.color"] || { type: "ALIAS", collection: "Semantics", path: "border/default" };
  const line = await createFrameHelper(node, "line", "NONE", 0, 0, 0, border, null, 0, null, figmaVarsMap);
  line.layoutAlign = "STRETCH";
  line.layoutGrow = 1;
  line.resize(line.width, 1);
}

async function drawAlertToastBanner(node: ComponentNode, styles: any, options: any, componentId: string, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = "HORIZONTAL";
  node.itemSpacing = 12;
  node.primaryAxisAlignItems = "MIN";
  
  node.primaryAxisSizingMode = "FIXED";
  node.counterAxisSizingMode = "AUTO";
  node.resize(280, node.height);

  const indicator = figma.createFrame();
  indicator.name = "indicator";
  indicator.primaryAxisSizingMode = "FIXED";
  indicator.counterAxisSizingMode = "FIXED";
  indicator.resize(14, 14);
  indicator.cornerRadius = 99;
  
  const toneColor = options.tone === "success" ? { r: 0.1, g: 0.8, b: 0.4 } : 
                    options.tone === "error" ? { r: 0.9, g: 0.2, b: 0.2 } :
                    options.tone === "warning" ? { r: 0.9, g: 0.6, b: 0.1 } : { r: 0.2, g: 0.5, b: 0.9 };
  indicator.fills = [{ type: 'SOLID', color: toneColor }];
  node.appendChild(indicator);

  const messageStack = figma.createFrame();
  messageStack.name = "messageStack";
  messageStack.layoutMode = "VERTICAL";
  messageStack.itemSpacing = 2;
  messageStack.fills = [];
  messageStack.layoutGrow = 1;
  messageStack.primaryAxisSizingMode = "AUTO";
  messageStack.counterAxisSizingMode = "AUTO";
  
  await createTextHelper(messageStack, "title", options.title || "Notification Title", 12, styles["label.color"], "Inter", "Bold", figmaVarsMap);
  await createTextHelper(messageStack, "desc", options.description || "Detailed message regarding the alert.", 11, styles["text.color"], "Inter", "Regular", figmaVarsMap);
  
  node.appendChild(messageStack);

  const close = figma.createVector();
  close.name = "closeIcon";
  close.vectorPaths = [{ windingRule: "NONZERO", data: "M 2 2 L 8 8 M 8 2 L 2 8" }];
  close.strokes = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }];
  close.strokeWeight = 1.2;
  node.appendChild(close);
}

async function drawCardModal(node: ComponentNode, styles: any, options: any, componentId: string, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = "VERTICAL";
  node.itemSpacing = 16;
  node.primaryAxisAlignItems = "MIN";
  node.counterAxisAlignItems = "MIN";
  
  node.primaryAxisSizingMode = "FIXED";
  node.counterAxisSizingMode = "FIXED";
  node.resize(320, 220);

  const header = figma.createFrame();
  header.name = "header";
  header.layoutMode = "HORIZONTAL";
  header.fills = [];
  header.layoutAlign = "STRETCH";
  header.primaryAxisAlignItems = "MIN";
  header.primaryAxisSizingMode = "AUTO";
  header.counterAxisSizingMode = "AUTO";
  
  const titleText = await createTextHelper(header, "title", options.title || (componentId === "card" ? "Card Header" : "Dialog Window"), 14, styles["text.color"] || styles["label.color"], "Inter", "Bold", figmaVarsMap);
  titleText.layoutGrow = 1;
  
  if (componentId === "modal") {
    await createTextHelper(header, "close", "✕", 14, styles["text.color"], "Inter", "Medium", figmaVarsMap);
  }
  node.appendChild(header);

  await drawDivider(node, styles, figmaVarsMap);

  // Resize TextNode before locking textAutoResize to HEIGHT so it doesn't wrap into single-character columns!
  const desc = await createTextHelper(node, "bodyText", options.bodyText || options.description || "This represents the main content block for the container. Describe options, states, and guidelines.", 12, styles["text.color"], "Inter", "Regular", figmaVarsMap);
  desc.resize(280, 40);
  desc.layoutAlign = "STRETCH";
  desc.layoutGrow = 1;
  desc.textAutoResize = "HEIGHT";

  const footer = figma.createFrame();
  footer.name = "footer";
  footer.layoutMode = "HORIZONTAL";
  footer.fills = [];
  footer.itemSpacing = 8;
  footer.layoutAlign = "STRETCH";
  footer.primaryAxisAlignItems = componentId === "modal" ? "MAX" : "MIN";
  footer.primaryAxisSizingMode = "AUTO";
  footer.counterAxisSizingMode = "AUTO";

  if (componentId === "modal") {
    const btnCancel = figma.createFrame();
    btnCancel.name = "btnCancel";
    btnCancel.layoutMode = "HORIZONTAL";
    btnCancel.paddingLeft = 12; btnCancel.paddingRight = 12;
    btnCancel.paddingTop = 6; btnCancel.paddingBottom = 6;
    btnCancel.cornerRadius = 6;
    btnCancel.fills = [{ type: 'SOLID', color: { r: 0.15, g: 0.15, b: 0.18 } }];
    btnCancel.strokes = [{ type: 'SOLID', color: { r: 0.25, g: 0.25, b: 0.3 } }];
    await createTextHelper(btnCancel, "text", "Cancel", 11, null, "Inter", "Medium", figmaVarsMap);
    footer.appendChild(btnCancel);
  }

  const btnAction = figma.createFrame();
  btnAction.name = "btnAction";
  btnAction.layoutMode = "HORIZONTAL";
  btnAction.paddingLeft = 16; btnAction.paddingRight = 16;
  btnAction.paddingTop = 6; btnAction.paddingBottom = 6;
  btnAction.cornerRadius = 6;
  
  const activeVar = figmaVarsMap.get("Semantics/action/primary/default");
  if (activeVar) {
    btnAction.fills = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', activeVar)];
  } else {
    btnAction.fills = [{ type: 'SOLID', color: { r: 0.38, g: 0.4, b: 0.95 } }];
  }
  
  await createTextHelper(btnAction, "text", options.btnLabel || "Confirm", 11, { type: "LITERAL", value: "#ffffff" }, "Inter", "Semi Bold", figmaVarsMap);
  footer.appendChild(btnAction);

  node.appendChild(footer);
}

async function drawInteractiveNavigation(node: ComponentNode, styles: any, options: any, componentId: string, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = "VERTICAL";
  node.itemSpacing = 8;
  
  if (componentId === "tabs") {
    node.layoutMode = "HORIZONTAL";
    node.itemSpacing = 16;
    
    const tab1 = figma.createFrame();
    tab1.name = "tabItemActive";
    tab1.layoutMode = "VERTICAL";
    tab1.paddingBottom = 6;
    tab1.fills = [];
    
    const activeVar = figmaVarsMap.get("Semantics/action/primary/default");
    if (activeVar) {
      tab1.strokes = [figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }, 'color', activeVar)];
    } else {
      tab1.strokes = [{ type: 'SOLID', color: { r: 0.38, g: 0.4, b: 0.95 } }];
    }
    tab1.strokeWeight = 2.5;
    
    await createTextHelper(tab1, "label", "Active Tab", 12.5, styles["text.color"], "Inter", "Semi Bold", figmaVarsMap);
    node.appendChild(tab1);

    const tab2 = figma.createFrame();
    tab2.name = "tabItem";
    tab2.layoutMode = "VERTICAL";
    tab2.paddingBottom = 6;
    tab2.fills = [];
    await createTextHelper(tab2, "label", "Inactive Tab", 12.5, { type: "ALIAS", collection: "Semantics", path: "text/muted" }, "Inter", "Regular", figmaVarsMap);
    node.appendChild(tab2);

  } else if (componentId === "accordion") {
    node.primaryAxisSizingMode = "FIXED";
    node.counterAxisSizingMode = "AUTO";
    node.resize(220, node.height);
    
    const header = figma.createFrame();
    header.name = "accordionHeader";
    header.layoutMode = "HORIZONTAL";
    header.layoutAlign = "STRETCH";
    header.fills = [];
    
    const title = await createTextHelper(header, "title", options.label || "Collapsible Header", 12.5, styles["text.color"], "Inter", "Medium", figmaVarsMap);
    title.layoutGrow = 1;
    
    const arrow = figma.createVector();
    arrow.name = "chevron";
    arrow.vectorPaths = [{ windingRule: "NONZERO", data: "M 2 4 L 6 8 L 10 4" }];
    arrow.strokes = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }];
    arrow.strokeWeight = 1.5;
    header.appendChild(arrow);
    node.appendChild(header);

  } else if (componentId === "dropdown") {
    const trigger = figma.createFrame();
    trigger.name = "dropdownTrigger";
    trigger.layoutMode = "HORIZONTAL";
    trigger.paddingLeft = 12; trigger.paddingRight = 12;
    trigger.paddingTop = 6; trigger.paddingBottom = 6;
    trigger.cornerRadius = 6;
    trigger.fills = [{ type: 'SOLID', color: { r: 0.15, g: 0.15, b: 0.18 } }];
    trigger.strokes = [{ type: 'SOLID', color: { r: 0.25, g: 0.25, b: 0.3 } }];
    await createTextHelper(trigger, "text", "Dropdown Menu ▾", 11.5, null, "Inter", "Medium", figmaVarsMap);
    node.appendChild(trigger);
  }
}

async function drawTable(node: ComponentNode, styles: any, options: any, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = "VERTICAL";
  node.itemSpacing = 0;
  
  node.primaryAxisSizingMode = "FIXED";
  node.counterAxisSizingMode = "FIXED";
  node.resize(320, 160);

  const header = figma.createFrame();
  header.name = "tableHeader";
  header.layoutMode = "HORIZONTAL";
  header.layoutAlign = "STRETCH"; // Stretches header row to fill 320px
  header.paddingTop = 8; header.paddingBottom = 8;
  header.paddingLeft = 12; header.paddingRight = 12;
  header.fills = [{ type: 'SOLID', color: { r: 0.15, g: 0.15, b: 0.18 } }];
  header.strokes = [{ type: 'SOLID', color: { r: 0.22, g: 0.22, b: 0.26 } }];
  header.strokeWeight = 1;
  
  const col1 = await createTextHelper(header, "col1", "Item ID", 11, null, "Inter", "Bold", figmaVarsMap);
  col1.layoutGrow = 1;
  const col2 = await createTextHelper(header, "col2", "Name", 11, null, "Inter", "Bold", figmaVarsMap);
  col2.layoutGrow = 2;
  const col3 = await createTextHelper(header, "col3", "Status", 11, null, "Inter", "Bold", figmaVarsMap);
  col3.layoutGrow = 1;
  node.appendChild(header);

  const row1 = figma.createFrame();
  row1.name = "tableRow1";
  row1.layoutMode = "HORIZONTAL";
  row1.layoutAlign = "STRETCH";
  row1.paddingTop = 8; row1.paddingBottom = 8;
  row1.paddingLeft = 12; row1.paddingRight = 12;
  row1.fills = [];
  row1.strokes = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.24 } }];
  row1.strokeWeight = 1;
  
  const col1_1 = await createTextHelper(row1, "col1", "#01", 11, null, "Inter", "Regular", figmaVarsMap);
  col1_1.layoutGrow = 1;
  const col1_2 = await createTextHelper(row1, "col2", "Workspace Sync", 11, null, "Inter", "Regular", figmaVarsMap);
  col1_2.layoutGrow = 2;
  const col1_3 = await createTextHelper(row1, "col3", "Active", 11, { type: "LITERAL", value: "#10b981" }, "Inter", "Medium", figmaVarsMap);
  col1_3.layoutGrow = 1;
  node.appendChild(row1);

  const row2 = figma.createFrame();
  row2.name = "tableRow2";
  row2.layoutMode = "HORIZONTAL";
  row2.layoutAlign = "STRETCH";
  row2.paddingTop = 8; row2.paddingBottom = 8;
  row2.paddingLeft = 12; row2.paddingRight = 12;
  row2.fills = options.striped ? [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.12 } }] : [];
  row2.strokes = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.24 } }];
  row2.strokeWeight = 1;
  
  const col2_1 = await createTextHelper(row2, "col1", "#02", 11, null, "Inter", "Regular", figmaVarsMap);
  col2_1.layoutGrow = 1;
  const col2_2 = await createTextHelper(row2, "col2", "Tokens Engine", 11, null, "Inter", "Regular", figmaVarsMap);
  col2_2.layoutGrow = 2;
  const col2_3 = await createTextHelper(row2, "col3", "Pending", 11, { type: "LITERAL", value: "#f59e0b" }, "Inter", "Medium", figmaVarsMap);
  col2_3.layoutGrow = 1;
  node.appendChild(row2);
}

async function drawNavbarSidebar(node: ComponentNode, styles: any, options: any, componentId: string, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = componentId === "navbar" ? "HORIZONTAL" : "VERTICAL";
  node.itemSpacing = 16;
  node.primaryAxisAlignItems = "MIN";
  
  node.primaryAxisSizingMode = "FIXED";
  node.counterAxisSizingMode = "FIXED";

  if (componentId === "navbar") {
    node.resize(340, 42);
    await createTextHelper(node, "logo", "✦ Arkitype", 13.5, styles["text.color"], "Inter", "Bold", figmaVarsMap);
    
    const spacer = figma.createFrame();
    spacer.fills = [];
    spacer.layoutGrow = 1;
    spacer.resize(10, 10);
    node.appendChild(spacer);
    
    await createTextHelper(node, "link1", "Home", 11.5, { type: "ALIAS", collection: "Semantics", path: "text/muted" }, "Inter", "Medium", figmaVarsMap);
    await createTextHelper(node, "link2", "Docs", 11.5, { type: "ALIAS", collection: "Semantics", path: "text/muted" }, "Inter", "Medium", figmaVarsMap);
  } else {
    node.resize(140, 240);
    node.paddingTop = 16; node.paddingLeft = 12; node.paddingRight = 12;
    node.counterAxisAlignItems = "MIN";

    await createTextHelper(node, "logo", "✦ Navigation", 13, styles["text.color"], "Inter", "Bold", figmaVarsMap);
    
    const spacer = figma.createFrame();
    spacer.fills = [];
    spacer.resize(10, 12);
    node.appendChild(spacer);

    for (const text of ["Dashboard", "Tokens", "Components", "Settings"]) {
      const item = figma.createFrame();
      item.layoutMode = "HORIZONTAL";
      item.paddingLeft = 8; item.paddingRight = 8;
      item.paddingTop = 6; item.paddingBottom = 6;
      item.cornerRadius = 4;
      
      const active = text === "Components";
      item.fills = active ? [{ type: 'SOLID', color: { r: 0.15, g: 0.15, b: 0.18 } }] : [];
      
      await createTextHelper(item, "text", text, 11.5, active ? styles["text.color"] : { type: "ALIAS", collection: "Semantics", path: "text/muted" }, "Inter", active ? "Semi Bold" : "Regular", figmaVarsMap);
      node.appendChild(item);
    }
  }
}

async function drawNavigationLanes(node: ComponentNode, styles: any, options: any, componentId: string, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = "HORIZONTAL";
  node.itemSpacing = 8;

  if (componentId === "breadcrumbs") {
    await createTextHelper(node, "home", "Home", 11.5, { type: "ALIAS", collection: "Semantics", path: "text/muted" }, "Inter", "Regular", figmaVarsMap);
    await createTextHelper(node, "sep1", "/", 11.5, { type: "ALIAS", collection: "Semantics", path: "text/muted" }, "Inter", "Regular", figmaVarsMap);
    await createTextHelper(node, "step", "Library", 11.5, { type: "ALIAS", collection: "Semantics", path: "text/muted" }, "Inter", "Regular", figmaVarsMap);
    await createTextHelper(node, "sep2", "/", 11.5, { type: "ALIAS", collection: "Semantics", path: "text/muted" }, "Inter", "Regular", figmaVarsMap);
    await createTextHelper(node, "profile", "Profile", 11.5, styles["text.color"], "Inter", "Medium", figmaVarsMap);

  } else if (componentId === "steps") {
    for (const stepNum of [1, 2, 3]) {
      const circle = figma.createFrame();
      circle.primaryAxisSizingMode = "FIXED";
      circle.counterAxisSizingMode = "FIXED";
      circle.resize(18, 18);
      circle.cornerRadius = 99;
      circle.layoutMode = "HORIZONTAL";
      circle.primaryAxisAlignItems = "CENTER";
      circle.counterAxisAlignItems = "CENTER";
      
      const active = stepNum === 2;
      circle.fills = active ? [{ type: 'SOLID', color: { r: 0.38, g: 0.4, b: 0.95 } }] : [{ type: 'SOLID', color: { r: 0.15, g: 0.15, b: 0.18 } }];
      await createTextHelper(circle, "num", stepNum.toString(), 10, { type: "LITERAL", value: "#ffffff" }, "Inter", "Bold", figmaVarsMap);
      node.appendChild(circle);
      
      if (stepNum < 3) {
        const line = figma.createFrame();
        line.primaryAxisSizingMode = "FIXED";
        line.counterAxisSizingMode = "FIXED";
        line.resize(24, 2);
        line.fills = [{ type: 'SOLID', color: { r: 0.22, g: 0.22, b: 0.26 } }];
        node.appendChild(line);
      }
    }

  } else if (componentId === "pagination") {
    for (const label of ["⟨", "1", "2", "3", "⟩"]) {
      const btn = figma.createFrame();
      btn.primaryAxisSizingMode = "FIXED";
      btn.counterAxisSizingMode = "FIXED";
      btn.resize(22, 22);
      btn.cornerRadius = 4;
      btn.layoutMode = "HORIZONTAL";
      btn.primaryAxisAlignItems = "CENTER";
      btn.counterAxisAlignItems = "CENTER";
      
      const active = label === "2";
      btn.fills = active ? [{ type: 'SOLID', color: { r: 0.38, g: 0.4, b: 0.95 } }] : [];
      btn.strokes = [{ type: 'SOLID', color: { r: 0.22, g: 0.22, b: 0.26 } }];
      btn.strokeWeight = 1;
      
      await createTextHelper(btn, "label", label, 11, { type: "LITERAL", value: active ? "#ffffff" : "#a1a1aa" }, "Inter", active ? "Bold" : "Regular", figmaVarsMap);
      node.appendChild(btn);
    }
  }
}

async function drawListFeedItems(node: ComponentNode, styles: any, options: any, componentId: string, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = "HORIZONTAL";
  node.itemSpacing = 12;
  node.primaryAxisAlignItems = "MIN";
  
  node.primaryAxisSizingMode = "FIXED";
  node.resize(280, node.height);

  const avatar = figma.createFrame();
  avatar.name = "avatar";
  avatar.primaryAxisSizingMode = "FIXED";
  avatar.counterAxisSizingMode = "FIXED";
  avatar.resize(28, 28);
  avatar.cornerRadius = 99;
  avatar.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.25 } }];
  node.appendChild(avatar);

  const textStack = figma.createFrame();
  textStack.name = "textStack";
  textStack.layoutMode = "VERTICAL";
  textStack.itemSpacing = 2;
  textStack.fills = [];
  textStack.layoutGrow = 1;
  textStack.primaryAxisSizingMode = "AUTO";
  textStack.counterAxisSizingMode = "AUTO";
  
  await createTextHelper(textStack, "title", options.title || "List Item Headline", 12, styles["label.color"] || styles["text.color"], "Inter", "Semi Bold", figmaVarsMap);
  await createTextHelper(textStack, "desc", options.subtitle || "Supporting subtext line descriptor.", 10.5, { type: "ALIAS", collection: "Semantics", path: "text/muted" }, "Inter", "Regular", figmaVarsMap);
  node.appendChild(textStack);

  const chevron = figma.createVector();
  chevron.name = "arrow";
  chevron.vectorPaths = [{ windingRule: "NONZERO", data: "M 2 2 L 6 6 L 2 10" }];
  chevron.strokes = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }];
  chevron.strokeWeight = 1.5;
  node.appendChild(chevron);
}

async function drawComplexDisplays(node: ComponentNode, styles: any, options: any, componentId: string, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = "VERTICAL";
  node.itemSpacing = 12;
  
  if (componentId === "emptyState") {
    node.primaryAxisAlignItems = "CENTER";
    node.counterAxisAlignItems = "CENTER";
    node.primaryAxisSizingMode = "FIXED";
    node.counterAxisSizingMode = "FIXED";
    node.resize(260, 180);

    const graphic = figma.createFrame();
    graphic.name = "graphic";
    graphic.primaryAxisSizingMode = "FIXED";
    graphic.counterAxisSizingMode = "FIXED";
    graphic.resize(48, 48);
    graphic.cornerRadius = 8;
    graphic.fills = [{ type: 'SOLID', color: { r: 0.15, g: 0.15, b: 0.18 } }];
    node.appendChild(graphic);

    await createTextHelper(node, "title", "No items synchronized", 13.5, styles["text.color"], "Inter", "Bold", figmaVarsMap);
    
    // Resize first to 200px before applying HEIGHT wrap
    const sub = await createTextHelper(node, "sub", "Pasted schemas will appear here as catalog widgets.", 11, { type: "ALIAS", collection: "Semantics", path: "text/muted" }, "Inter", "Regular", figmaVarsMap);
    sub.resize(200, 10);
    sub.textAutoResize = "HEIGHT";
    
    const btn = figma.createFrame();
    btn.name = "btn";
    btn.layoutMode = "HORIZONTAL";
    btn.paddingLeft = 12; btn.paddingRight = 12;
    btn.paddingTop = 4; btn.paddingBottom = 4;
    btn.cornerRadius = 4;
    btn.fills = [{ type: 'SOLID', color: { r: 0.22, g: 0.22, b: 0.26 } }];
    await createTextHelper(btn, "text", "Import Files", 10.5, null, "Inter", "Medium", figmaVarsMap);
    node.appendChild(btn);

  } else if (componentId === "codeBlock") {
    node.primaryAxisSizingMode = "FIXED";
    node.counterAxisSizingMode = "FIXED";
    node.resize(240, 100);
    node.paddingTop = 12; node.paddingBottom = 12;
    node.paddingLeft = 12; node.paddingRight = 12;
    node.cornerRadius = 6;
    node.fills = [{ type: 'SOLID', color: { r: 0.05, g: 0.05, b: 0.06 } }];

    await createTextHelper(node, "line1", "const sync = new Arkitype();", 11, { type: "LITERAL", value: "#c084fc" }, "Courier New", "Regular", figmaVarsMap);
    await createTextHelper(node, "line2", "sync.variables.apply();", 11, { type: "LITERAL", value: "#818cf8" }, "Courier New", "Regular", figmaVarsMap);
  }
}

async function drawStats(node: ComponentNode, styles: any, options: any, componentId: string, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = "VERTICAL";
  node.itemSpacing = 4;
  node.primaryAxisAlignItems = "MIN";
  node.counterAxisAlignItems = "MIN";

  if (componentId === "stat") {
    await createTextHelper(node, "label", "Monthly Revenue", 11, { type: "ALIAS", collection: "Semantics", path: "text/muted" }, "Inter", "Medium", figmaVarsMap);
    
    const valueRow = figma.createFrame();
    valueRow.layoutMode = "HORIZONTAL";
    valueRow.itemSpacing = 8;
    valueRow.fills = [];
    valueRow.primaryAxisSizingMode = "AUTO";
    valueRow.counterAxisSizingMode = "AUTO";
    
    await createTextHelper(valueRow, "value", "$45,210.00", 20, styles["text.color"], "Inter", "Bold", figmaVarsMap);
    await createTextHelper(valueRow, "trend", "▲ 12.4%", 10, { type: "LITERAL", value: "#10b981" }, "Inter", "Bold", figmaVarsMap);
    
    node.appendChild(valueRow);
  } else {
    node.layoutMode = "HORIZONTAL";
    node.itemSpacing = 24;
    
    const stat1 = figma.createFrame();
    stat1.layoutMode = "VERTICAL";
    stat1.itemSpacing = 4;
    stat1.fills = [];
    await createTextHelper(stat1, "label", "Subscribers", 11, { type: "ALIAS", collection: "Semantics", path: "text/muted" }, "Inter", "Medium", figmaVarsMap);
    await createTextHelper(stat1, "value", "12.8K", 18, styles["text.color"], "Inter", "Bold", figmaVarsMap);
    node.appendChild(stat1);

    const stat2 = figma.createFrame();
    stat2.layoutMode = "VERTICAL";
    stat2.itemSpacing = 4;
    stat2.fills = [];
    await createTextHelper(stat2, "label", "Bounce Rate", 11, { type: "ALIAS", collection: "Semantics", path: "text/muted" }, "Inter", "Medium", figmaVarsMap);
    await createTextHelper(stat2, "value", "42.1%", 18, styles["text.color"], "Inter", "Bold", figmaVarsMap);
    node.appendChild(stat2);
  }
}

async function drawAdvancedControls(
  node: ComponentNode, 
  styles: any, 
  options: any, 
  componentId: string, 
  state: string, 
  figmaVarsMap: Map<string, Variable>
) {
  options = options || {};
  node.layoutMode = "HORIZONTAL";
  node.itemSpacing = 8;

  if (componentId === "stepper") {
    const btnMinus = figma.createFrame();
    btnMinus.primaryAxisSizingMode = "FIXED";
    btnMinus.counterAxisSizingMode = "FIXED";
    btnMinus.resize(24, 24);
    btnMinus.cornerRadius = 4;
    btnMinus.layoutMode = "HORIZONTAL";
    btnMinus.primaryAxisAlignItems = "CENTER";
    btnMinus.counterAxisAlignItems = "CENTER";
    btnMinus.fills = [{ type: 'SOLID', color: { r: 0.15, g: 0.15, b: 0.18 } }];
    await createTextHelper(btnMinus, "text", "−", 12, null, "Inter", "Bold", figmaVarsMap);
    node.appendChild(btnMinus);
    
    await createTextHelper(node, "value", "01", 13, styles["text.color"], "Courier New", "Regular", figmaVarsMap);

    const btnPlus = figma.createFrame();
    btnPlus.primaryAxisSizingMode = "FIXED";
    btnPlus.counterAxisSizingMode = "FIXED";
    btnPlus.resize(24, 24);
    btnPlus.cornerRadius = 4;
    btnPlus.layoutMode = "HORIZONTAL";
    btnPlus.primaryAxisAlignItems = "CENTER";
    btnPlus.counterAxisAlignItems = "CENTER";
    btnPlus.fills = [{ type: 'SOLID', color: { r: 0.15, g: 0.15, b: 0.18 } }];
    await createTextHelper(btnPlus, "text", "+", 12, null, "Inter", "Bold", figmaVarsMap);
    node.appendChild(btnPlus);

  } else if (componentId === "buttonGroup") {
    node.itemSpacing = 0;
    
    for (const label of ["Left", "Center", "Right"]) {
      const btn = figma.createFrame();
      btn.layoutMode = "HORIZONTAL";
      btn.paddingLeft = 12; btn.paddingRight = 12;
      btn.paddingTop = 6; btn.paddingBottom = 6;
      btn.fills = [];
      btn.strokes = [{ type: 'SOLID', color: { r: 0.22, g: 0.22, b: 0.26 } }];
      
      const active = label === "Left";
      if (active) {
        btn.fills = [{ type: 'SOLID', color: { r: 0.18, g: 0.18, b: 0.22 } }];
      }
      
      await createTextHelper(btn, "label", label, 11.5, active ? styles["text.color"] : { type: "ALIAS", collection: "Semantics", path: "text/muted" }, "Inter", active ? "Bold" : "Regular", figmaVarsMap);
      node.appendChild(btn);
    }

  } else if (componentId === "field") {
    node.layoutMode = "VERTICAL";
    node.itemSpacing = 6;
    node.primaryAxisSizingMode = "FIXED";
    node.counterAxisSizingMode = "AUTO";
    node.resize(200, node.height);
    node.counterAxisAlignItems = "MIN";

    await createTextHelper(node, "label", "Email Address", 11.5, styles["text.color"], "Inter", "Bold", figmaVarsMap);
    
    const input = figma.createFrame();
    input.name = "input";
    input.layoutMode = "HORIZONTAL";
    input.paddingLeft = 8; input.paddingRight = 8;
    input.paddingTop = 6; input.paddingBottom = 6;
    input.cornerRadius = 4;
    input.fills = [{ type: 'SOLID', color: { r: 0.08, g: 0.08, b: 0.1 } }];
    input.strokes = [{ type: 'SOLID', color: { r: 0.22, g: 0.22, b: 0.26 } }];
    
    await createTextHelper(input, "text", "name@example.com", 11, { type: "ALIAS", collection: "Semantics", path: "text/muted" }, "Inter", "Regular", figmaVarsMap);
    node.appendChild(input);

    await createTextHelper(node, "helpText", "Required for notification logs.", 10, { type: "ALIAS", collection: "Semantics", path: "text/muted" }, "Inter", "Regular", figmaVarsMap);
  }
}

async function drawStatusIndicators(node: ComponentNode, styles: any, options: any, componentId: string, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = "HORIZONTAL";
  
  if (componentId === "spinner") {
    node.primaryAxisSizingMode = "FIXED";
    node.counterAxisSizingMode = "FIXED";
    node.resize(16, 16);

    const ring = figma.createEllipse();
    ring.name = "ring";
    ring.resize(16, 16);
    ring.strokes = [{ type: 'SOLID', color: { r: 0.38, g: 0.4, b: 0.95 } }];
    ring.strokeWeight = 2;
    ring.dashPattern = [4, 4];
    node.appendChild(ring);

  } else if (componentId === "skeleton") {
    node.layoutMode = "VERTICAL";
    node.itemSpacing = 8;
    
    for (const width of [140, 100, 120]) {
      const line = figma.createFrame();
      line.primaryAxisSizingMode = "FIXED";
      line.counterAxisSizingMode = "FIXED";
      line.resize(width, 10);
      line.cornerRadius = 4;
      line.fills = [{ type: 'SOLID', color: { r: 0.15, g: 0.15, b: 0.18 } }];
      node.appendChild(line);
    }

  } else if (componentId === "kbd") {
    node.paddingLeft = 6; node.paddingRight = 6;
    node.paddingTop = 3; node.paddingBottom = 3;
    node.cornerRadius = 4;
    node.fills = [{ type: 'SOLID', color: { r: 0.18, g: 0.18, b: 0.22 } }];
    node.strokes = [{ type: 'SOLID', color: { r: 0.28, g: 0.28, b: 0.32 } }];
    node.strokeWeight = 1;
    
    await createTextHelper(node, "key", "Ctrl", 10.5, styles["text.color"], "Courier New", "Bold", figmaVarsMap);
  }
}

async function drawFallback(node: ComponentNode, componentId: string) {
  const placeholderText = figma.createText();
  placeholderText.name = "placeholder";
  placeholderText.characters = componentId.toUpperCase();
  placeholderText.fontName = await loadFontSafe("Inter", "Bold");
  placeholderText.fontSize = 12;
  placeholderText.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }];
  node.appendChild(placeholderText);
  node.primaryAxisSizingMode = "FIXED";
  node.counterAxisSizingMode = "FIXED";
  node.resize(100, 32);
}

async function drawComponentDocsCard(
  parentContainer: FrameNode, 
  comp: any,
  figmaVarsMap: Map<string, Variable>
) {
  const cardName = `${comp.name} Documentation`;
  let card = parentContainer.children.find(c => c.type === "FRAME" && c.name === cardName) as FrameNode;
  
  if (!card) {
    card = figma.createFrame();
    card.name = cardName;
    parentContainer.appendChild(card);
  } else {
    [...card.children].forEach(c => c.remove());
  }

  card.layoutMode = "VERTICAL";
  card.itemSpacing = 16;
  card.paddingTop = 24;
  card.paddingBottom = 24;
  card.paddingLeft = 24;
  card.paddingRight = 24;
  card.primaryAxisSizingMode = "AUTO";
  card.counterAxisSizingMode = "FIXED";
  card.resize(320, 300);
  card.cornerRadius = 8;
  card.fills = [{ type: 'SOLID', color: { r: 0.12, g: 0.12, b: 0.14 } }];
  card.strokes = [{ type: 'SOLID', color: { r: 0.22, g: 0.22, b: 0.26 } }];
  card.strokeWeight = 1;

  const title = figma.createText();
  title.characters = `${comp.name} Guidelines`;
  title.fontName = await loadFontSafe("Inter", "Bold");
  title.fontSize = 16;
  title.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.98 } }];
  card.appendChild(title);

  const tierFrame = figma.createFrame();
  tierFrame.layoutMode = "HORIZONTAL";
  tierFrame.paddingTop = 2;
  tierFrame.paddingBottom = 2;
  tierFrame.paddingLeft = 8;
  tierFrame.paddingRight = 8;
  tierFrame.cornerRadius = 99;
  tierFrame.primaryAxisSizingMode = "AUTO";
  tierFrame.counterAxisSizingMode = "AUTO";
  
  const isTier1 = comp.tier === 1;
  tierFrame.fills = [
    { 
      type: 'SOLID', 
      color: isTier1 ? { r: 0.2, g: 0.25, b: 0.5 } : { r: 0.4, g: 0.2, b: 0.6 } 
    }
  ];

  const tierText = figma.createText();
  tierText.characters = `TIER ${comp.tier}`;
  tierText.fontName = await loadFontSafe("Inter", "Bold");
  tierText.fontSize = 9;
  tierText.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  tierFrame.appendChild(tierText);
  card.appendChild(tierFrame);

  const desc = figma.createText();
  desc.characters = comp.description || "No description provided.";
  desc.resize(272, 10);
  desc.textAutoResize = "HEIGHT";
  desc.fontName = await loadFontSafe("Inter", "Regular");
  desc.fontSize = 11;
  desc.fills = [{ type: 'SOLID', color: { r: 0.65, g: 0.65, b: 0.7 } }];
  card.appendChild(desc);

  const divider = figma.createFrame();
  divider.resize(272, 1);
  divider.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.24 } }];
  card.appendChild(divider);

  const specsTitle = figma.createText();
  specsTitle.characters = "SPECIFICATIONS";
  specsTitle.fontName = await loadFontSafe("Inter", "Bold");
  specsTitle.fontSize = 9;
  specsTitle.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.55 } }];
  card.appendChild(specsTitle);

  const specText = figma.createText();
  const sampleVariant = comp.variants && comp.variants.length > 0 ? comp.variants[0] : null;
  const optionKeys = sampleVariant && sampleVariant.options ? Object.keys(sampleVariant.options) : [];
  const stateKeys = comp.variants ? Array.from(new Set(comp.variants.map((v: any) => v.properties?.state || "default"))) as string[] : ["default"];
  
  let specsString = `• Interaction States: ${stateKeys.join(", ")}\n`;
  if (sampleVariant && optionKeys.length > 0) {
    specsString += `• Component Options:\n  ${optionKeys.map(k => `- ${k}: ${sampleVariant.options[k]}`).join("\n  ")}\n`;
  }
  
  const boundPaints: string[] = [];
  const boundDims: string[] = [];
  
  if (sampleVariant && sampleVariant.styles) {
    Object.entries(sampleVariant.styles).forEach(([propKey, styleVal]: [string, any]) => {
      if (styleVal && styleVal.type === "ALIAS") {
        const bStr = `${propKey} ➔ ${styleVal.path}`;
        if (propKey.includes("bg") || propKey.includes("color") || propKey.includes("border")) {
          boundPaints.push(bStr);
        } else {
          boundDims.push(bStr);
        }
      }
    });
  }

  if (boundPaints.length > 0) {
    specsString += `\n• Token Color Mappings:\n  ${boundPaints.slice(0, 4).map(s => `- ${s}`).join("\n  ")}`;
  }
  if (boundDims.length > 0) {
    specsString += `\n• Spacing & Structural Mappings:\n  ${boundDims.slice(0, 3).map(s => `- ${s}`).join("\n  ")}`;
  }

  specText.characters = specsString;
  specText.resize(272, 10);
  specText.textAutoResize = "HEIGHT";
  specText.fontName = await loadFontSafe("Inter", "Regular");
  specText.fontSize = 10.5;
  specText.lineHeight = { value: 15, unit: "PIXELS" };
  specText.fills = [{ type: 'SOLID', color: { r: 0.75, g: 0.75, b: 0.8 } }];
  
  card.appendChild(specText);
}

// Draw Link helper
async function drawLink(node: ComponentNode, styles: any, options: any, figmaVarsMap: Map<string, Variable>) {
  options = options || {};
  node.layoutMode = "HORIZONTAL";
  node.itemSpacing = 4;
  node.primaryAxisAlignItems = "MIN";
  node.counterAxisAlignItems = "CENTER";
  
  const text = await createTextHelper(
    node, 
    "label", 
    options.label || "Link Action ➔", 
    12.5, 
    styles["text.color"] || { type: "ALIAS", collection: "Semantics", path: "action/primary/default" }, 
    "Inter", 
    "Medium", 
    figmaVarsMap
  );
  text.textDecoration = "UNDERLINE";
}
