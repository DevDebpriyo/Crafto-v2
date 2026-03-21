"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { DielineEditor } from "@/components/dieline-editor";
import { PackageViewer3D } from "@/components/package-viewer-3d";
import { AIChatPanel } from "@/components/AIChatPanel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ZoomIn, ZoomOut, Play, Pause, Settings, Sun, Warehouse, Layers, CylinderIcon, Eye as EyeIcon, EyeOff as EyeOffIcon, Box, ShoppingBag } from "lucide-react";
import {
  type PackageType,
  type PackageDimensions,
  DEFAULT_PACKAGE_DIMENSIONS,
  generateDieline,
  type DielinePath,
} from "@/lib/packaging-types";

export default function Packaging() {
  const [zoomAction, setZoomAction] = useState<"in" | "out" | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [selectedColor, setSelectedColor] = useState("#60a5fa");
  const [lightingMode, setLightingMode] = useState<"studio" | "sunset" | "warehouse" | "forest">("studio");
  const [displayMode, setDisplayMode] = useState<"solid" | "wireframe">("solid");

  // Advanced packaging state
  const [packageType, setPackageType] = useState<PackageType>("box");
  const [dimensions, setDimensions] = useState<PackageDimensions>(DEFAULT_PACKAGE_DIMENSIONS.box);
  const [dielines, setDielines] = useState<DielinePath[]>([]);
  const [activeView, setActiveView] = useState<"2d" | "3d">("3d");

  // Compute initial dielines from package type and dimensions
  const computedDielines = useMemo(() => generateDieline(packageType, dimensions), [packageType, dimensions]);

  // Update dielines when computed ones change
  useEffect(() => {
    setDielines(computedDielines);
  }, [computedDielines]);

  // Reset zoom action after it's been processed
  useEffect(() => {
    if (zoomAction) {
      const timer = setTimeout(() => setZoomAction(null), 200);
      return () => clearTimeout(timer);
    }
  }, [zoomAction]);

  const packageTypes: { type: PackageType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { type: "box", label: "Box", icon: Box },
    { type: "cylinder", label: "Cylinder", icon: CylinderIcon },
  ];

  const handlePackageTypeChange = (type: PackageType) => {
    setPackageType(type);
    setDimensions(DEFAULT_PACKAGE_DIMENSIONS[type]);
  };

  const handleDimensionChange = (key: keyof PackageDimensions, value: number) => {
    // Ensure value is valid and only update the specific dimension
    // This function explicitly updates ONLY the specified dimension key
    // and leaves all other dimensions completely unchanged
    const validValue = isNaN(value) || value < 0 ? 0 : value;
    setDimensions((prev) => {
      // Explicitly preserve all other dimensions and only update the specified one
      // This ensures X, Y, and Z are completely independent
      const newDimensions = {
        width: prev.width,   // X - preserved unless key is "width"
        height: prev.height,  // Y - preserved unless key is "height"
        depth: prev.depth,    // Z - preserved unless key is "depth"
      };
      // Only update the dimension that was requested
      newDimensions[key] = validValue;
      return newDimensions;
    });
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Canvas Area */}
          <div className="flex-1 overflow-hidden">
            {activeView === "2d" ? (
              <DielineEditor dielines={dielines} onDielineChange={setDielines} editable={true} />
            ) : (
              <div className="h-full bg-muted/30 relative">
                <PackageViewer3D
                  packageType={packageType}
                  dimensions={dimensions}
                  dielines={dielines}
                  color={selectedColor}
                />

                {/* Floating Controls */}
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                  <Button size="icon" variant="secondary" onClick={() => setZoomAction("in")}>
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="secondary" onClick={() => setZoomAction("out")}>
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="secondary" onClick={() => setAutoRotate(!autoRotate)}>
                    {autoRotate ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="secondary">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setLightingMode("studio")}>
                        <Settings className="w-4 h-4 mr-2" />
                        Studio Lighting
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setLightingMode("sunset")}>
                        <Sun className="w-4 h-4 mr-2" />
                        Sunset Lighting
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setLightingMode("warehouse")}>
                        <Warehouse className="w-4 h-4 mr-2" />
                        Warehouse Lighting
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setDisplayMode("solid")}>
                        <EyeIcon className="w-4 h-4 mr-2" />
                        Solid View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDisplayMode("wireframe")}>
                        <EyeOffIcon className="w-4 h-4 mr-2" />
                        Wireframe View
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="w-[380px] border-l-2 border-black bg-card overflow-hidden flex flex-col flex-shrink-0">
          <div className="border-b-2 border-black flex-shrink-0 px-4 py-3">
            <h2 className="text-sm font-semibold">
              Controls
            </h2>
          </div>

          {/* Chat Section - Pinned to Top */}
          <div className="border-b border-border p-4 flex-shrink-0 bg-muted/10">
            <h3 className="text-xs font-medium text-muted-foreground mb-2">AI Assistant</h3>
            <AIChatPanel />
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col space-y-4">
            {/* View Toggle Buttons */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">View Mode</Label>
              <div className="flex gap-2">
                <Button
                  variant={activeView === "2d" ? "default" : "outline"}
                  className="flex-1"
                  size="sm"
                  onClick={() => setActiveView("2d")}
                >
                  2D Dieline Editor
                </Button>
                <Button
                  variant={activeView === "3d" ? "default" : "outline"}
                  className="flex-1"
                  size="sm"
                  onClick={() => setActiveView("3d")}
                >
                  3D Preview
                </Button>
              </div>
            </div>

            {/* Package Type Selection */}
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground">Package Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {packageTypes.map(({ type, label, icon: Icon }) => (
                  <Button
                    key={type}
                    variant={packageType === type ? "default" : "outline"}
                    className="flex flex-col items-center gap-1 h-auto py-3"
                    size="sm"
                    onClick={() => handlePackageTypeChange(type)}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs">{label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Dimensions */}
            <Card className="p-4 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Dimensions (mm)</h3>

              {packageType === "box" ? (
                <>
                  {/* X (Width) - Only edits width */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">X</Label>
                      <Input
                        type="number"
                        value={dimensions.width}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (!isNaN(val) && val >= 0) {
                            handleDimensionChange("width", val);
                          }
                        }}
                        className="w-16 h-7 text-xs"
                        min={0}
                      />
                    </div>
                    <Slider
                      value={[dimensions.width]}
                      onValueChange={([value]) => handleDimensionChange("width", value)}
                      min={20}
                      max={300}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  {/* Y (Height) - Only edits height */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Y</Label>
                      <Input
                        type="number"
                        value={dimensions.height}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (!isNaN(val) && val >= 0) {
                            handleDimensionChange("height", val);
                          }
                        }}
                        className="w-16 h-7 text-xs"
                        min={0}
                      />
                    </div>
                    <Slider
                      value={[dimensions.height]}
                      onValueChange={([value]) => handleDimensionChange("height", value)}
                      min={20}
                      max={400}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  {/* Z (Depth) - Only edits depth, does NOT affect X (width) or Y (height) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Z</Label>
                      <Input
                        type="number"
                        value={dimensions.depth}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (!isNaN(val) && val >= 0) {
                            // Only update depth, X (width) and Y (height) remain unchanged
                            handleDimensionChange("depth", val);
                          }
                        }}
                        className="w-16 h-7 text-xs"
                        min={0}
                      />
                    </div>
                    <Slider
                      value={[dimensions.depth]}
                      onValueChange={([value]) => {
                        // Only update depth, X (width) and Y (height) remain unchanged
                        handleDimensionChange("depth", value);
                      }}
                      min={20}
                      max={300}
                      step={5}
                      className="w-full"
                    />
                  </div>
                </>
              ) : packageType === "cylinder" ? (
                <>
                  {/* Radius - Only edits radius (stored as width/diameter) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Radius</Label>
                      <Input
                        type="number"
                        value={dimensions.width / 2}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (!isNaN(val) && val >= 0) {
                            // Only update width (diameter = 2 * radius), height and depth remain unchanged
                            handleDimensionChange("width", val * 2);
                          }
                        }}
                        className="w-16 h-7 text-xs"
                        min={0}
                      />
                    </div>
                    <Slider
                      value={[dimensions.width / 2]}
                      onValueChange={([value]) => {
                        // Only update width (diameter = 2 * radius), height remains unchanged
                        handleDimensionChange("width", value * 2);
                      }}
                      min={10}
                      max={150}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  {/* Height - Only edits height */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Height</Label>
                      <Input
                        type="number"
                        value={dimensions.height}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (!isNaN(val) && val >= 0) {
                            // Only update height, radius (width) remains unchanged
                            handleDimensionChange("height", val);
                          }
                        }}
                        className="w-16 h-7 text-xs"
                        min={0}
                      />
                    </div>
                    <Slider
                      value={[dimensions.height]}
                      onValueChange={([value]) => {
                        // Only update height, radius (width) remains unchanged
                        handleDimensionChange("height", value);
                      }}
                      min={20}
                      max={400}
                      step={5}
                      className="w-full"
                    />
                  </div>
                </>
              ) : null}
            </Card>

            {/* Dieline Info */}
            <Card className="p-4 space-y-2 bg-muted/50">
              <h3 className="text-sm font-semibold text-foreground">Dieline Information</h3>
              <div className="text-xs space-y-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Total Paths:</span>
                  <span className="font-medium text-foreground">{dielines.length}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Total Points:</span>
                  <span className="font-medium text-foreground">
                    {dielines.reduce((sum, path) => sum + path.points.length, 0)}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Surface Area:</span>
                  <span className="font-medium text-foreground">
                    {Math.round(
                      2 *
                        (dimensions.width * dimensions.height +
                          dimensions.width * dimensions.depth +
                          dimensions.height * dimensions.depth),
                    )}{" "}
                    mm²
                  </span>
                </div>
              </div>
            </Card>

            {/* Quick Actions */}
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start bg-transparent" size="sm">
                Reset to Default
              </Button>
              <Button variant="outline" className="w-full justify-start bg-transparent" size="sm">
                Import Custom Dieline
              </Button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
