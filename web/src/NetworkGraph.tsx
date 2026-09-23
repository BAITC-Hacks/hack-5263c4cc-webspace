import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { graphlib, layout } from "@dagrejs/dagre";
import { toPng } from "html-to-image";
import {
  Background,
  BackgroundVariant,
  BaseEdge,
  EdgeLabelRenderer,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react";
import {
  ArrowsOutSimpleIcon,
  ArrowRightIcon,
  ArrowsLeftRightIcon,
  ArrowsMergeIcon,
  ArrowsSplitIcon,
  BankIcon,
  CircleDashedIcon,
  CrosshairSimpleIcon,
  DownloadSimpleIcon,
  GraphIcon,
  ListBulletsIcon,
  MinusIcon,
  PlusIcon,
  StackIcon,
  XIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { GraphData, GraphEdge } from "./api";
import {
  communityColor,
  exactMoney,
  money,
  number,
  roleColor,
  roleLabel,
} from "./api";

interface Props {
  data: GraphData;
  onSelect: (gid: number) => void;
  colorBy?: "role" | "cluster";
}
type Account = GraphData["nodes"][number];
type AccountNode = Node<
  {
    account: Account;
    color: string;
    root: boolean;
    colorBy: "role" | "cluster";
  },
  "account"
>;
type TransferEdge = Edge<
  { transfer: GraphEdge; showLabel: boolean; returnLane: number },
  "transfer"
>;
const nodeWidth = 124;
const nodeHeight = 136;
const glyphY = 36;
const graphColors = {
  ink: "#20251f",
  incoming: "#098830",
  outgoing: "#677b92",
  related: "#c0c9bb",
  surface: "#ffffff",
};
const fitOptions = { padding: 0.14, minZoom: 0.9, maxZoom: 1.08 };
const edgeRank = (a: GraphEdge, b: GraphEdge) =>
  b.sum_kzt - a.sum_kzt ||
  a.src - b.src ||
  a.dst - b.dst ||
  a.id.localeCompare(b.id);
const roleIcons = {
  consolidator: ArrowsMergeIcon,
  transit: ArrowsLeftRightIcon,
  distributor: ArrowsSplitIcon,
  coordinator: GraphIcon,
  terminal: StackIcon,
  boundary_unknown: CircleDashedIcon,
};

// Glyphs describe graph roles, never inferred people, institutions, or owners.
const AccountGlyph = memo(function AccountGlyph({
  data,
}: NodeProps<AccountNode>) {
  const { account, color, root, colorBy } = data;
  const Icon = roleIcons[account.role as keyof typeof roleIcons] ?? BankIcon;
  const label =
    colorBy === "cluster"
      ? `Community ${account.cluster_id}`
      : roleLabel(account.role);
  const radius = root ? 34 : 27;
  return (
    <div className="relative flex h-[136px] w-[124px] flex-col items-center text-foreground">
      {(["target", "source"] as const).flatMap((type) =>
        ([Position.Left, Position.Right] as const).map((position) => (
          <Handle
            key={`${type}-${position}`}
            id={`${type}-${position}`}
            type={type}
            position={position}
            isConnectable={false}
            style={{
              top: glyphY,
              left:
                position === Position.Left
                  ? nodeWidth / 2 - radius
                  : nodeWidth / 2 + radius,
              right: "auto",
              width: 1,
              height: 1,
              minWidth: 0,
              minHeight: 0,
              border: 0,
              opacity: 0,
              pointerEvents: "none",
            }}
          />
        )),
      )}
      <div
        className="relative flex shrink-0 items-center justify-center rounded-full border-2"
        style={{
          width: radius * 2,
          height: radius * 2,
          marginTop: glyphY - radius,
          marginBottom: root ? 7 : 14,
          backgroundColor: root ? graphColors.ink : "#fff",
          borderColor: root ? graphColors.ink : color,
          color: root ? "#ffffff" : color,
          borderStyle: account.truncated_by_depth ? "dashed" : "solid",
        }}
      >
        <Icon size={root ? 28 : 24} weight="regular" aria-hidden="true" />
        {account.is_seed && (
          <span
            className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-white"
            style={{ backgroundColor: graphColors.outgoing }}
            title="Seed account"
          />
        )}
      </div>
      <div className="max-w-[124px] bg-[#ffffff] px-1 text-center font-mono text-base font-semibold leading-5 tabular-nums break-all">
        {account.gid}
      </div>
      <div className="max-w-[124px] bg-[#ffffff] px-1 text-center text-[13px] leading-[18px] text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 flex items-center gap-1 bg-[#ffffff] text-[11px] leading-4 text-muted-foreground">
        {root && <span className="font-medium text-foreground">Selected</span>}
        {account.truncated_by_depth && (
          <span>{root ? "· Boundary" : "Boundary"}</span>
        )}
        {account.is_seed && (
          <span>{root || account.truncated_by_depth ? "· Seed" : "Seed"}</span>
        )}
      </div>
    </div>
  );
});

const TransferLine = memo(function TransferLine(
  props: EdgeProps<TransferEdge>,
) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    markerEnd,
    style,
    data,
    selected,
  } = props;
  const returning = props.source === props.target || targetX < sourceX;
  let path: string;
  let labelX: number;
  let labelY: number;
  if (returning) {
    // Return paths and self-transfers remain recorded evidence, including cycles.
    const top = Math.min(sourceY, targetY) - 65 - (data?.returnLane ?? 0) * 20;
    const reach = props.source === props.target ? 46 : 32;
    path = `M ${sourceX},${sourceY} C ${sourceX + reach},${sourceY} ${sourceX + reach},${top} ${sourceX},${top} L ${targetX},${top} C ${targetX - reach},${top} ${targetX - reach},${targetY} ${targetX},${targetY}`;
    labelX = (sourceX + targetX) / 2;
    labelY = top;
  } else {
    const distance = Math.max(54, (targetX - sourceX) * 0.48);
    path = `M ${sourceX},${sourceY} C ${sourceX + distance},${sourceY} ${targetX - distance},${targetY} ${targetX},${targetY}`;
    labelX = (sourceX + targetX) / 2;
    labelY = (sourceY + targetY) / 2;
  }
  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={style}
        interactionWidth={24}
      />
      {data && (data.showLabel || selected) && (
        <EdgeLabelRenderer>
          <span
            className="pointer-events-none absolute whitespace-nowrap rounded px-1.5 py-0.5 text-[12px] font-medium leading-4 tabular-nums"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              backgroundColor: selected ? graphColors.ink : graphColors.surface,
              color: selected ? "#ffffff" : "#535c4f",
            }}
          >
            {money(data.transfer.sum_kzt)}
          </span>
        </EdgeLabelRenderer>
      )}
    </>
  );
});
const nodeTypes = { account: AccountGlyph };
const edgeTypes = { transfer: TransferLine };
const a11yLabels = {
  "node.a11yDescription.default":
    "Press Enter or Space to inspect this account. Press Escape to clear selection.",
  "node.a11yDescription.keyboardDisabled":
    "Press Enter or Space to inspect this account.",
  "edge.a11yDescription.default":
    "Press Enter or Space to read exact transfer evidence.",
};

export default function NetworkGraph({
  data,
  onSelect,
  colorBy = "role",
}: Props) {
  const capture = useRef<HTMLDivElement>(null);
  const instance = useRef<ReactFlowInstance<AccountNode, TransferEdge> | null>(
    null,
  );
  const [expanded, setExpanded] = useState(false);
  const [edge, setEdge] = useState<GraphEdge | null>(null);
  const [view, setView] = useState(() =>
    window.matchMedia("(max-width: 639px)").matches ? "transfers" : "flow",
  );
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const root =
    data.nodes.find((node) => node.is_root || node.gid === data.root_gid) ??
    data.nodes[0];
  const motionDuration = useCallback(
    (event?: MouseEvent<HTMLButtonElement>) =>
      event?.detail === 0 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : 200,
    [],
  );
  useEffect(() => {
    setExpanded(false);
    setEdge(null);
    setExportError(null);
  }, [data.root_gid]);

  // Selection and categorical color changes do not recompute layout.
  const scene = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>();
    if (!root)
      return {
        accounts: [] as Account[],
        transfers: [] as GraphEdge[],
        positions,
      };
    const rootId = String(root.id);
    const incoming = data.edges
      .filter(
        (item) =>
          String(item.target) === rootId && String(item.source) !== rootId,
      )
      .sort(edgeRank);
    const outgoing = data.edges
      .filter(
        (item) =>
          String(item.source) === rootId && String(item.target) !== rootId,
      )
      .sort(edgeRank);
    const visible = new Set<string>([
      rootId,
      ...incoming.slice(0, 3).map((item) => String(item.source)),
      ...outgoing.slice(0, 3).map((item) => String(item.target)),
    ]);
    if (expanded) {
      for (const item of [...incoming, ...outgoing].sort(edgeRank)) {
        if (visible.size >= 25) break;
        visible.add(
          String(item.source) === rootId
            ? String(item.target)
            : String(item.source),
        );
      }
      for (const account of [...data.nodes].sort(
        (a, b) => b.priority_score - a.priority_score || a.gid - b.gid,
      )) {
        if (visible.size >= 25) break;
        visible.add(String(account.id));
      }
    }
    const accounts = data.nodes.filter((account) =>
      visible.has(String(account.id)),
    );
    const transfers = data.edges
      .filter(
        (item) =>
          visible.has(String(item.source)) && visible.has(String(item.target)),
      )
      .sort(edgeRank);
    const dagre = new graphlib.Graph({ multigraph: true });
    dagre.setDefaultEdgeLabel(() => ({}));
    dagre.setGraph({
      rankdir: "LR",
      ranksep: 104,
      nodesep: 30,
      marginx: 38,
      marginy: 88,
    });
    for (const account of accounts)
      dagre.setNode(String(account.id), {
        width: nodeWidth,
        height: nodeHeight,
      });
    if (expanded) {
      for (const item of transfers)
        if (item.source !== item.target)
          dagre.setEdge(
            String(item.source),
            String(item.target),
            {},
            String(item.id),
          );
    } else {
      // Layout constraints keep the selected account between counterparties.
      // Reciprocal and cross-account edges below still come from observed transfers.
      for (const account of accounts) {
        const id = String(account.id);
        if (id === rootId) continue;
        const received =
          incoming.find((item) => String(item.source) === id)?.sum_kzt ?? -1;
        const sent =
          outgoing.find((item) => String(item.target) === id)?.sum_kzt ?? -1;
        dagre.setEdge(
          received >= sent ? id : rootId,
          received >= sent ? rootId : id,
        );
      }
    }
    layout(dagre);
    for (const account of accounts) {
      const point = dagre.node(String(account.id));
      positions.set(String(account.id), {
        x: point.x - nodeWidth / 2,
        y: point.y - nodeHeight / 2,
      });
    }
    return { accounts, transfers, positions };
  }, [data, root, expanded]);

  const nodes = useMemo<AccountNode[]>(
    () =>
      scene.accounts.map((account) => {
        const isRoot = account.id === root?.id;
        return {
          id: String(account.id),
          type: "account",
          width: nodeWidth,
          height: nodeHeight,
          position: scene.positions.get(String(account.id))!,
          selected: isRoot,
          focusable: true,
          draggable: false,
          ariaLabel: `Account ${account.gid}. ${colorBy === "cluster" ? `Community ${account.cluster_id}.` : `${roleLabel(account.role)} role hypothesis.`}${account.truncated_by_depth ? " Observation boundary." : ""}${account.is_seed ? " Seed account." : ""}${isRoot ? " Selected." : ""}`,
          data: {
            colorBy,
            account,
            root: isRoot,
            color:
              colorBy === "cluster"
                ? communityColor(account.cluster_id)
                : roleColor(account.role),
          },
        };
      }),
    [scene.accounts, scene.positions, root?.id, colorBy],
  );
  const edges = useMemo<TransferEdge[]>(() => {
    let returnCount = 0;
    return scene.transfers.map((item, index) => {
      const incomingToRoot = String(item.target) === String(root?.id);
      const outgoingFromRoot = String(item.source) === String(root?.id);
      const selected = item.id === edge?.id;
      const color = selected
        ? graphColors.ink
        : incomingToRoot
          ? graphColors.incoming
          : outgoingFromRoot
            ? graphColors.outgoing
            : graphColors.related;
      const returns =
        (scene.positions.get(String(item.target))?.x ?? 0) <=
        (scene.positions.get(String(item.source))?.x ?? 0);
      return {
        id: String(item.id),
        type: "transfer",
        source: String(item.source),
        target: String(item.target),
        sourceHandle: "source-right",
        targetHandle: "target-left",
        selected,
        data: {
          transfer: item,
          showLabel: index < 8,
          returnLane: returns ? returnCount++ % 3 : 0,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 15,
          height: 15,
          color,
        },
        style: {
          stroke: color,
          strokeWidth: selected
            ? 2.4
            : incomingToRoot || outgoingFromRoot
              ? 1.6
              : 1.2,
        },
        focusable: true,
        ariaLabel: `Account ${item.src} to account ${item.dst}. ${exactMoney(item.sum_kzt)} across ${number(item.n_tx)} recorded transfers.`,
      };
    });
  }, [scene.transfers, scene.positions, root?.id, edge?.id]);
  const fitScene = useCallback(
    (event?: MouseEvent<HTMLButtonElement>) => {
      void instance.current?.fitView({
        ...fitOptions,
        duration: motionDuration(event),
      });
    },
    [motionDuration],
  );
  const focusAccount = useCallback(
    (event?: MouseEvent<HTMLButtonElement>) => {
      if (!root) return;
      const point = scene.positions.get(String(root.id));
      if (point)
        void instance.current?.setCenter(
          point.x + nodeWidth / 2,
          point.y + glyphY,
          { zoom: 1, duration: motionDuration(event) },
        );
    },
    [root, scene.positions, motionDuration],
  );
  useEffect(() => {
    if (view !== "flow") return;
    const frame = requestAnimationFrame(() => fitScene());
    return () => cancelAnimationFrame(frame);
  }, [scene, view, fitScene]);

  const exportGraph = async () => {
    if (!capture.current) return;
    setExporting(true);
    setExportError(null);
    try {
      const url = await toPng(capture.current, {
        backgroundColor: graphColors.surface,
        pixelRatio: 2,
        cacheBust: true,
        filter: (element) =>
          !(
            element instanceof HTMLElement &&
            element.dataset.graphExport === "exclude"
          ),
      });
      const link = document.createElement("a");
      link.href = url;
      link.download = `aqshalens-observed-flow-${data.root_gid ?? "overview"}.png`;
      link.click();
    } catch {
      setExportError(
        "Image export failed. The exact transfer table remains available.",
      );
    } finally {
      setExporting(false);
    }
  };
  const omitted = Math.max(0, data.nodes.length - nodes.length);
  const visibleRoles = [
    ...new Set(scene.accounts.map((account) => account.role)),
  ].sort();
  const controls = [
    {
      label: "Zoom in",
      Icon: PlusIcon,
      action: (event: MouseEvent<HTMLButtonElement>) =>
        void instance.current?.zoomIn({ duration: motionDuration(event) }),
    },
    {
      label: "Zoom out",
      Icon: MinusIcon,
      action: (event: MouseEvent<HTMLButtonElement>) =>
        void instance.current?.zoomOut({ duration: motionDuration(event) }),
    },
    {
      label: "Fit visible accounts",
      Icon: ArrowsOutSimpleIcon,
      action: fitScene,
    },
    {
      label: "Center selected account",
      Icon: CrosshairSimpleIcon,
      action: focusAccount,
    },
    {
      label: "Download current view as PNG",
      Icon: DownloadSimpleIcon,
      action: () => void exportGraph(),
      disabled: exporting,
    },
  ];
  return (
    <Tabs
      value={view}
      onValueChange={(value) => setView(String(value))}
      className="gap-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList
          aria-label="Network evidence view"
          variant="line"
          className="gap-4 px-0"
        >
          <TabsTrigger value="flow" className="px-0">
            <GraphIcon />
            Flow
          </TabsTrigger>
          <TabsTrigger value="transfers" className="px-0">
            <ListBulletsIcon />
            Transfers{" "}
            <span className="ml-0.5 text-xs tabular-nums text-muted-foreground">
              {scene.transfers.length}
            </span>
          </TabsTrigger>
        </TabsList>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="tabular-nums">
            <span className="font-medium text-foreground">{nodes.length}</span>{" "}
            of {data.nodes.length} loaded accounts
          </span>
          {(omitted > 0 || expanded) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setExpanded((value) => !value);
                setEdge(null);
              }}
            >
              {expanded ? <MinusIcon /> : <PlusIcon />}
              {expanded
                ? "Focus account"
                : `Expand to ${Math.min(25, data.nodes.length)}`}
            </Button>
          )}
        </div>
      </div>
      <TabsContent value="flow" className="flex flex-col gap-3">
        <div
          ref={capture}
          className="relative h-[410px] overflow-hidden rounded-xl border border-border/70 bg-[#ffffff] sm:h-[520px]"
        >
          <div className="pointer-events-none absolute inset-x-5 top-4 z-10 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="h-px w-5 bg-[#098830]" />
              Incoming to selected
            </span>
            <span className="flex items-center gap-2">
              Outgoing from selected
              <span className="h-px w-5 bg-[#677b92]" />
            </span>
          </div>
          <ReactFlow<AccountNode, TransferEdge>
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onInit={(value) => {
              instance.current = value;
            }}
            onNodeClick={(_, node) => {
              if (node.data.account.gid !== root?.gid)
                onSelect(node.data.account.gid);
            }}
            onNodesChange={(changes) => {
              const selected = changes.find(
                (change) => change.type === "select" && change.selected,
              );
              if (selected && "id" in selected) {
                const node = nodes.find((item) => item.id === selected.id);
                if (node && node.data.account.gid !== root?.gid)
                  onSelect(node.data.account.gid);
              }
            }}
            onEdgeClick={(_, item) => setEdge(item.data?.transfer ?? null)}
            onEdgesChange={(changes) => {
              const selected = changes.find(
                (change) => change.type === "select" && change.selected,
              );
              if (selected && "id" in selected)
                setEdge(
                  scene.transfers.find(
                    (item) => String(item.id) === selected.id,
                  ) ?? null,
                );
            }}
            onPaneClick={() => setEdge(null)}
            fitView
            fitViewOptions={fitOptions}
            minZoom={0.9}
            maxZoom={1.8}
            nodesDraggable={false}
            nodesConnectable={false}
            edgesReconnectable={false}
            nodesFocusable
            edgesFocusable
            deleteKeyCode={null}
            selectionKeyCode={null}
            zoomOnScroll={false}
            panOnScroll={false}
            zoomOnDoubleClick={false}
            ariaLabelConfig={a11yLabels}
            colorMode="light"
            aria-label="Observed account network. Select an account or a transfer to inspect its evidence."
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={28}
              size={0.65}
              color="#e0e6dc"
            />
          </ReactFlow>
          <div
            className="absolute bottom-4 right-4 flex items-center gap-0.5 rounded-lg border bg-background p-1"
            role="toolbar"
            aria-label="Graph navigation"
            data-graph-export="exclude"
          >
            {controls.map(({ label, Icon, action, disabled }) => (
              <Tooltip key={label}>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={label}
                      onClick={action}
                      disabled={disabled}
                    >
                      <Icon />
                    </Button>
                  }
                />
                <TooltipContent>{label}</TooltipContent>
              </Tooltip>
            ))}
          </div>
          {nodes.length === 0 && (
            <p className="absolute inset-x-5 top-1/2 text-center text-sm text-muted-foreground">
              No accounts in this neighborhood.
            </p>
          )}
          {nodes.length === 1 && scene.transfers.length === 0 && (
            <p className="absolute inset-x-5 bottom-20 mx-auto max-w-sm bg-[#ffffff] text-center text-xs leading-5 text-muted-foreground">
              No recorded transfers for this account. The account remains part
              of the dataset.
            </p>
          )}
        </div>
        <div
          className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground"
          aria-label="Network evidence legend"
        >
          <span className="flex items-center gap-1.5">
            <ArrowRightIcon className="size-3.5" />
            Recorded transfer direction
          </span>
          <span className="flex items-center gap-1.5">
            <CircleDashedIcon className="size-3.5" />
            Observation boundary
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[#677b92]" />
            Seed account
          </span>
          {scene.transfers.length > 8 && (
            <span>
              Amounts shown for the 8 largest relationships; select any line for
              details.
            </span>
          )}
        </div>
      </TabsContent>
      <TabsContent value="transfers">
        <div className="max-h-[470px] overflow-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead className="text-right">Observed amount</TableHead>
                <TableHead className="text-right">Transfers</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scene.transfers.map((item) => (
                <TableRow
                  key={item.id}
                  data-state={edge?.id === item.id ? "selected" : undefined}
                >
                  <TableCell>
                    <Button
                      variant="link"
                      className="font-mono"
                      onClick={() => onSelect(item.src)}
                    >
                      {item.src}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="link"
                      className="font-mono"
                      onClick={() => onSelect(item.dst)}
                    >
                      {item.dst}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      className="tabular-nums"
                      onClick={() => setEdge(item)}
                    >
                      {exactMoney(item.sum_kzt)}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {number(item.n_tx)}
                  </TableCell>
                </TableRow>
              ))}
              {scene.transfers.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No recorded transfers in the visible selection.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
      {edge && (
        <div
          className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-3 text-sm"
          role="status"
        >
          <Badge variant="outline">Recorded transfer</Badge>
          <strong className="font-mono">{edge.src}</strong>
          <ArrowRightIcon className="size-4 text-muted-foreground" />
          <strong className="font-mono">{edge.dst}</strong>
          <span className="ml-auto font-semibold tabular-nums">
            {exactMoney(edge.sum_kzt)}
          </span>
          <span className="text-muted-foreground">
            across {number(edge.n_tx)} transfers
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Close transfer details"
            onClick={() => setEdge(null)}
          >
            <XIcon />
          </Button>
        </div>
      )}
      {exportError && (
        <p role="alert" className="text-sm text-destructive">
          {exportError}
        </p>
      )}
      <div className="flex flex-col gap-2 text-xs text-muted-foreground">
        {colorBy === "role" ? (
          <ul
            aria-label="Role color legend"
            className="flex flex-wrap gap-x-4 gap-y-2"
          >
            {visibleRoles.map((role) => (
              <li key={role} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="size-2 rounded-full"
                  style={{ backgroundColor: roleColor(role) }}
                />
                {roleLabel(role)}
              </li>
            ))}
          </ul>
        ) : (
          <ul
            aria-label="Community color legend"
            className="flex flex-wrap gap-x-4 gap-y-2"
          >
            {[...new Set(scene.accounts.map((account) => account.cluster_id))]
              .sort((a, b) => a - b)
              .map((id) => (
                <li key={id} className="flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="size-2 rounded-full"
                    style={{ backgroundColor: communityColor(id) }}
                  />
                  Community {id}
                </li>
              ))}
          </ul>
        )}
        <p className="leading-5">
          {expanded
            ? "Expanded neighborhood"
            : "Three largest incoming and outgoing relationships"}
          .
          {omitted > 0
            ? ` ${number(omitted)} loaded accounts are outside this view.`
            : ""}
          {data.truncated ? " The server neighborhood is also bounded." : ""}{" "}
          Amounts aggregate observed transfers. Role labels are hypotheses.
        </p>
      </div>
    </Tabs>
  );
}
