// Generated from web/openapi.json. Do not edit by hand.
export interface paths {
    "/api/v1/clusters": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Clusters */
        get: operations["clusters_api_v1_clusters_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/collectors": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Collectors */
        get: operations["collectors_api_v1_collectors_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/copilot": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Copilot */
        post: operations["copilot_api_v1_copilot_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/copilot/sessions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Create Conversation */
        post: operations["create_conversation_api_v1_copilot_sessions_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/copilot/sessions/{session_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Forget Conversation */
        delete: operations["forget_conversation_api_v1_copilot_sessions__session_id__delete"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/copilot/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Copilot Status */
        get: operations["copilot_status_api_v1_copilot_status_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/dossier/{gid}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Dossier */
        get: operations["dossier_api_v1_dossier__gid__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/exports/{name}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Export */
        get: operations["export_api_v1_exports__name__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/graph": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Graph */
        get: operations["graph_api_v1_graph_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Health */
        get: operations["health_api_v1_health_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/nodes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Nodes */
        get: operations["nodes_api_v1_nodes_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/nodes/{gid}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Node */
        get: operations["node_api_v1_nodes__gid__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/provenance": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Provenance */
        get: operations["provenance_api_v1_provenance_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/resilience": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Resilience */
        get: operations["resilience_api_v1_resilience_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/signals/{gid}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Node Signals */
        get: operations["node_signals_api_v1_signals__gid__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Summary */
        get: operations["summary_api_v1_summary_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /** Anomaly */
        Anomaly: {
            /** Evidence */
            evidence: string;
            /** Id */
            id: string;
            /** Metrics */
            metrics: components["schemas"]["PeerMetrics"] | components["schemas"]["PaymentMetrics"];
            /** Title */
            title: string;
        };
        /** CanonicalTables */
        CanonicalTables: {
            /** Edges */
            edges: string;
            /** Nodes */
            nodes: string;
            /** Transactions */
            transactions: string;
        };
        /** Citation */
        Citation: {
            /** Evidence Version */
            evidence_version?: string | null;
            /** Gid */
            gid: string;
            /** Kind */
            kind?: string | null;
            /** Label */
            label: string;
            /** Payload Sha256 */
            payload_sha256?: string | null;
            /** Text */
            text: string;
        };
        /** Cluster */
        Cluster: {
            /** Cluster Id */
            cluster_id: number;
            /** Hypothesis */
            hypothesis: string;
            /** N Nodes */
            n_nodes: number;
            /** N Seed */
            n_seed: number;
            /** Roles */
            roles: {
                [key: string]: number;
            };
            /** Sum Kzt Internal */
            sum_kzt_internal: number;
            /** Top Gids */
            top_gids: string[];
        };
        /** ClusterList */
        ClusterList: {
            /** Analysis Id */
            analysis_id: string;
            /** Items */
            items: components["schemas"]["Cluster"][];
        };
        /** Collector */
        Collector: {
            /** Gid */
            gid: string;
            /** Matched Sources */
            matched_sources: number;
            /** Paths */
            paths: components["schemas"]["CollectorPath"][];
            /** Priority Score */
            priority_score: number;
            /**
             * Role
             * @enum {string}
             */
            role: "consolidator" | "transit" | "distributor" | "terminal" | "coordinator" | "peripheral" | "boundary_unknown";
        };
        /** CollectorPath */
        CollectorPath: {
            /** Hops */
            hops: number;
            /** Path */
            path: string[];
            /** Source Gid */
            source_gid: string;
        };
        /** CollectorReport */
        CollectorReport: {
            /** Analysis Id */
            analysis_id: string;
            /** Caveat */
            caveat: string;
            /** Gids */
            gids: string[];
            /** Items */
            items: components["schemas"]["Collector"][];
            /** Max Hops */
            max_hops: number;
            /** Total */
            total: number;
            /** Truncated */
            truncated: boolean;
        };
        /** ConversationMemory */
        ConversationMemory: {
            /** Expires In Seconds */
            expires_in_seconds: number;
            /**
             * Persistence
             * @enum {string}
             */
            persistence: "process" | "sqlite";
            /** Session Id */
            session_id: string;
            /** Turns */
            turns: number;
        };
        /** ConversationTurn */
        ConversationTurn: {
            /** Content */
            content: string;
            /**
             * Role
             * @enum {string}
             */
            role: "user" | "assistant";
        };
        /** CopilotCapabilities */
        CopilotCapabilities: {
            /** Assistant Message Max Characters */
            assistant_message_max_characters: number;
            /** Attachments */
            attachments: boolean;
            /** Conversation History */
            conversation_history: boolean;
            /** History Max Characters */
            history_max_characters: number;
            /** History Max Turns */
            history_max_turns: number;
            /** Memory Max Sessions */
            memory_max_sessions: number;
            /** Memory Ttl Seconds */
            memory_ttl_seconds: number;
            /** Read Only Tools */
            read_only_tools: number;
            /** Session Memory */
            session_memory: boolean;
            /** Streaming */
            streaming: boolean;
            /** User Message Max Characters */
            user_message_max_characters: number;
        };
        /** CopilotInput */
        CopilotInput: {
            /** Gid */
            gid: string;
            /** Gids */
            gids?: string[] | null;
            /** History */
            history?: components["schemas"]["ConversationTurn"][];
            /** Question */
            question: string;
            /**
             * Remember
             * @default false
             */
            remember?: boolean;
            /** Session Id */
            session_id?: string | null;
        };
        /** CopilotResponse */
        CopilotResponse: {
            /** Analysis Id */
            analysis_id: string;
            /** Answer */
            answer: string;
            /** Citations */
            citations: components["schemas"]["Citation"][];
            execution: components["schemas"]["Execution"];
            /** Limitations */
            limitations: string[];
            memory?: components["schemas"]["ConversationMemory"] | null;
            /**
             * Mode
             * @enum {string}
             */
            mode: "offline" | "openai" | "fallback";
            /** Model */
            model?: string | null;
            /** Trace */
            trace: components["schemas"]["TraceStep"][];
        };
        /** CopilotStatus */
        CopilotStatus: {
            /** Analysis Id */
            analysis_id: string;
            capabilities: components["schemas"]["CopilotCapabilities"];
            /** Enabled */
            enabled: boolean;
            /** Message */
            message: string;
            /**
             * Mode
             * @enum {string}
             */
            mode: "openai" | "offline";
            /**
             * Provider Status
             * @constant
             */
            provider_status: "not_checked";
        };
        /** Counterparties */
        Counterparties: {
            /** Incoming */
            incoming: components["schemas"]["Counterparty"][];
            /** Outgoing */
            outgoing: components["schemas"]["Counterparty"][];
        };
        /** Counterparty */
        Counterparty: {
            /** Gid */
            gid: string;
            /** N Tx */
            n_tx: number;
            /**
             * Role
             * @enum {string}
             */
            role: "consolidator" | "transit" | "distributor" | "terminal" | "coordinator" | "peripheral" | "boundary_unknown";
            /** Sum Kzt */
            sum_kzt: number;
        };
        /** Counts */
        Counts: {
            /** Boundary Nodes */
            boundary_nodes: number;
            /** Clusters */
            clusters: number;
            /** Components */
            components: number;
            /** Edges */
            edges: number;
            /** Isolated Nodes */
            isolated_nodes: number;
            /** Nodes */
            nodes: number;
            /** Seeds */
            seeds: number;
            /** Transactions */
            transactions: number;
        };
        /** Cycle */
        Cycle: {
            /** Chronological Example */
            chronological_example: components["schemas"]["DatedEdge"][] | null;
            /** Edges */
            edges: components["schemas"]["CycleEdge"][];
            /**
             * Kind
             * @enum {string}
             */
            kind: "date_consistent_cycle" | "structural_cycle";
            /** Path */
            path: string[];
        };
        /** CycleEdge */
        CycleEdge: {
            /** Dates */
            dates: string[];
            /** Dst */
            dst: string;
            /** Src */
            src: string;
            /** Sum Kzt */
            sum_kzt: number;
        };
        /** Dataset */
        Dataset: {
            /** Description */
            description: string;
            /**
             * Kind
             * @enum {string}
             */
            kind: "synthetic" | "official";
            /** Name */
            name: string;
        };
        /** DatedEdge */
        DatedEdge: {
            /** Date */
            date: string;
            /** Dst */
            dst: string;
            /** Src */
            src: string;
            /** Sum Kzt */
            sum_kzt: number;
        };
        /** Dossier */
        Dossier: {
            /** Analysis Id */
            analysis_id: string;
            /** Citations */
            citations: string[];
            /** Evidence */
            evidence: string[];
            /** Gid */
            gid: string;
            /** Hypotheses */
            hypotheses: string[];
            /** Missing Evidence */
            missing_evidence: string[];
            /** Next Requests */
            next_requests: components["schemas"]["EvidenceRequest"][];
            /** Priority Score */
            priority_score: number;
            /**
             * Role
             * @enum {string}
             */
            role: "consolidator" | "transit" | "distributor" | "terminal" | "coordinator" | "peripheral" | "boundary_unknown";
            /** Title */
            title: string;
        };
        /** ErrorDetail */
        ErrorDetail: {
            /** Code */
            code: string;
            /** Message */
            message: string;
            /** Request Id */
            request_id: string;
        };
        /** ErrorResponse */
        ErrorResponse: {
            error: components["schemas"]["ErrorDetail"];
        };
        /** EvidenceRequest */
        EvidenceRequest: {
            /** Priority */
            priority: number;
            /** Reason */
            reason: string;
            /** Request */
            request: string;
        };
        /** Execution */
        Execution: {
            /** Elapsed Ms */
            elapsed_ms: number;
            /** Evidence Version */
            evidence_version?: string | null;
            /** Fallback Code */
            fallback_code?: string | null;
            /** Input Tokens */
            input_tokens: number;
            /** Model Rounds */
            model_rounds: number;
            /** Output Tokens */
            output_tokens: number;
            /** Run Id */
            run_id: string;
            /**
             * Status
             * @enum {string}
             */
            status: "completed" | "offline" | "fallback";
            /** Tool Calls */
            tool_calls: number;
        };
        /** ExportReceipt */
        ExportReceipt: {
            /** Bytes */
            bytes: number;
            /** Name */
            name: string;
            /** Rows */
            rows: number;
            /** Sha256 */
            sha256: string;
        };
        /** GraphData */
        GraphData: {
            /** Analysis Id */
            analysis_id: string;
            /** Edges */
            edges: components["schemas"]["GraphEdge"][];
            /** Nodes */
            nodes: components["schemas"]["GraphNode"][];
            /** Returned Edges */
            returned_edges: number;
            /** Returned Nodes */
            returned_nodes: number;
            /** Root Gid */
            root_gid: string | null;
            /** Total Edges */
            total_edges: number;
            /** Total Nodes */
            total_nodes: number;
            /** Truncated */
            truncated: boolean;
            /** Truncation Reasons */
            truncation_reasons: string[];
        };
        /** GraphEdge */
        GraphEdge: {
            /** Depth */
            depth: number;
            /** Dst */
            dst: string;
            /** Id */
            id: string;
            /** N Tx */
            n_tx: number;
            /** Source */
            source: string;
            /** Src */
            src: string;
            /** Sum Kzt */
            sum_kzt: number;
            /** Target */
            target: string;
        };
        /** GraphNode */
        GraphNode: {
            /** Cluster Id */
            cluster_id: number;
            /** Depth */
            depth: number;
            /** Evidence */
            evidence: string;
            /** Gid */
            gid: string;
            /** Id */
            id: string;
            /** In Degree */
            in_degree: number;
            /** In Kzt */
            in_kzt: number;
            /** Is Root */
            is_root: boolean;
            /** Is Seed */
            is_seed: boolean;
            /** Label */
            label: string;
            /** Out Degree */
            out_degree: number;
            /** Out Kzt */
            out_kzt: number;
            /** Priority Score */
            priority_score: number;
            /** Rank */
            rank: number;
            /**
             * Role
             * @enum {string}
             */
            role: "consolidator" | "transit" | "distributor" | "terminal" | "coordinator" | "peripheral" | "boundary_unknown";
            /** Role Score */
            role_score: number;
            /** Truncated By Depth */
            truncated_by_depth: boolean;
        };
        /** Health */
        Health: {
            /** Analysis Id */
            analysis_id: string;
            /**
             * Dataset Kind
             * @enum {string}
             */
            dataset_kind: "synthetic" | "official";
            /**
             * Status
             * @constant
             */
            status: "ok";
        };
        /** ManifestFile */
        ManifestFile: {
            /** Path */
            path: string;
            /** Sha256 */
            sha256: string;
        };
        /** Metrics */
        Metrics: {
            /** Active Days */
            active_days: number;
            /** Betweenness */
            betweenness: number;
            /** In Degree */
            in_degree: number;
            /** In Kzt */
            in_kzt: number;
            /** In Tx */
            in_tx: number;
            /** Matched 2D Ratio */
            matched_2d_ratio: number;
            /** Neighbor Clusters */
            neighbor_clusters: number;
            /** Out Degree */
            out_degree: number;
            /** Out Kzt */
            out_kzt: number;
            /** Out Tx */
            out_tx: number;
            /** Pagerank */
            pagerank: number;
            /** Pass Through */
            pass_through: number | null;
            /** Seed Reach */
            seed_reach: number;
            /** Visible Volume */
            visible_volume: number;
        };
        /** NodeDetail */
        NodeDetail: {
            /** Analysis Id */
            analysis_id: string;
            /** Cluster Id */
            cluster_id: number;
            counterparties: components["schemas"]["Counterparties"];
            /** Depth */
            depth: number;
            /** Evidence */
            evidence: string;
            /** Gid */
            gid: string;
            /** In Degree */
            in_degree: number;
            /** In Kzt */
            in_kzt: number;
            /** Is Seed */
            is_seed: boolean;
            /** Limitations */
            limitations: string[];
            metrics: components["schemas"]["Metrics"];
            observability: components["schemas"]["Observability"];
            /** Out Degree */
            out_degree: number;
            /** Out Kzt */
            out_kzt: number;
            /** Priority Score */
            priority_score: number;
            /** Rank */
            rank: number;
            /** Reasons */
            reasons: components["schemas"]["Reason"][];
            /**
             * Role
             * @enum {string}
             */
            role: "consolidator" | "transit" | "distributor" | "terminal" | "coordinator" | "peripheral" | "boundary_unknown";
            /** Role Score */
            role_score: number;
            /** Role Scores */
            role_scores: {
                [key: string]: number;
            };
            /** Score Factors */
            score_factors: components["schemas"]["ScoreFactor"][];
            /** Timeline */
            timeline: components["schemas"]["TimelineDay"][];
            /** Truncated By Depth */
            truncated_by_depth: boolean;
        };
        /** NodeList */
        NodeList: {
            /** Analysis Id */
            analysis_id: string;
            /** Items */
            items: components["schemas"]["NodeSummary"][];
            /** Total */
            total: number;
        };
        /** NodeSummary */
        NodeSummary: {
            /** Cluster Id */
            cluster_id: number;
            /** Depth */
            depth: number;
            /** Evidence */
            evidence: string;
            /** Gid */
            gid: string;
            /** In Degree */
            in_degree: number;
            /** In Kzt */
            in_kzt: number;
            /** Is Seed */
            is_seed: boolean;
            /** Out Degree */
            out_degree: number;
            /** Out Kzt */
            out_kzt: number;
            /** Priority Score */
            priority_score: number;
            /** Rank */
            rank: number;
            /**
             * Role
             * @enum {string}
             */
            role: "consolidator" | "transit" | "distributor" | "terminal" | "coordinator" | "peripheral" | "boundary_unknown";
            /** Role Score */
            role_score: number;
            /** Truncated By Depth */
            truncated_by_depth: boolean;
        };
        /** Observability */
        Observability: {
            /** Label */
            label: string;
            /**
             * Level
             * @enum {string}
             */
            level: "boundary" | "isolated" | "seed_limited" | "partial";
            /** Notes */
            notes: string[];
        };
        /** Occurrence */
        Occurrence: {
            /** In Date */
            in_date: string;
            /** In Kzt */
            in_kzt: number;
            /** Lag Days */
            lag_days: number;
            /** Out Date */
            out_date: string;
            /** Out Kzt */
            out_kzt: number;
        };
        /** PaymentMetrics */
        PaymentMetrics: {
            /** Amount Kzt */
            amount_kzt: number;
            /** Counterparties */
            counterparties: string[];
            /** Counterparty Count */
            counterparty_count: number;
            /** Date */
            date: string;
            /**
             * Direction
             * @enum {string}
             */
            direction: "incoming" | "outgoing";
            /** Sum Kzt */
            sum_kzt: number;
            /** Transaction Count */
            transaction_count: number;
        };
        /** PeerMetrics */
        PeerMetrics: {
            /** Comparison Baseline */
            comparison_baseline: number;
            /** Depth */
            depth: number;
            /** Peer Count */
            peer_count: number;
            /** Peer Median */
            peer_median: number;
            /** Percentile */
            percentile: number;
            /** Value */
            value: number;
        };
        /** Period */
        Period: {
            /** End */
            end: string | null;
            /** Start */
            start: string | null;
        };
        /** Provenance */
        Provenance: {
            /** Algorithm Sha256 */
            algorithm_sha256: string;
            /** Analysis Id */
            analysis_id: string;
            canonical_table_sha256: components["schemas"]["CanonicalTables"];
            /** Configuration Sha256 */
            configuration_sha256: string;
            /**
             * Dataset Kind
             * @enum {string}
             */
            dataset_kind: "synthetic" | "official";
            /** Dataset Sha256 */
            dataset_sha256: string;
            /** Dependency Lock Sha256 */
            dependency_lock_sha256: string;
            /** Exports */
            exports: components["schemas"]["ExportReceipt"][];
            /** Interpretation */
            interpretation: string;
            /** Rules Version */
            rules_version: string;
            /**
             * Schema Version
             * @constant
             */
            schema_version: 2;
            source_manifest: components["schemas"]["SourceManifest"];
        };
        /** Reason */
        Reason: {
            /** Detail */
            detail: string;
            /** Label */
            label: string;
            /** Value */
            value: string | number;
        };
        /** ResilienceChange */
        ResilienceChange: {
            /** Largest Component Nodes */
            largest_component_nodes: number;
            /** Reachable Seed Pairs */
            reachable_seed_pairs: number;
            /** Weak Components */
            weak_components: number;
        };
        /** ResilienceMetrics */
        ResilienceMetrics: {
            /** Edges */
            edges: number;
            /** Largest Component Nodes */
            largest_component_nodes: number;
            /** Nodes */
            nodes: number;
            /** Reachable Seed Pairs */
            reachable_seed_pairs: number;
            /** Weak Components */
            weak_components: number;
        };
        /** ResilienceReport */
        ResilienceReport: {
            after: components["schemas"]["ResilienceMetrics"];
            /** Analysis Id */
            analysis_id: string;
            baseline: components["schemas"]["ResilienceMetrics"];
            /** Caveat */
            caveat: string;
            change: components["schemas"]["ResilienceChange"];
            /** Removed Gids */
            removed_gids: string[];
            /** Top N */
            top_n: number;
        };
        /** Route */
        Route: {
            /** Distinct Start Dates */
            distinct_start_dates: number;
            /** Occurrence Count */
            occurrence_count: number;
            /** Occurrences */
            occurrences: components["schemas"]["Occurrence"][];
            /** Path */
            path: string[];
        };
        /** ScoreFactor */
        ScoreFactor: {
            /** Contribution */
            contribution: number;
            /** Label */
            label: string;
            /** Value */
            value: number;
            /** Weight */
            weight: number;
        };
        /** SessionInput */
        SessionInput: {
            /** Gid */
            gid: string;
            /** Gids */
            gids?: string[] | null;
        };
        /** SessionResponse */
        SessionResponse: {
            /** Analysis Id */
            analysis_id: string;
            /** Expires In Seconds */
            expires_in_seconds: number;
            /**
             * Persistence
             * @enum {string}
             */
            persistence: "process" | "sqlite";
            /** Session Id */
            session_id: string;
            /** Turns */
            turns: number;
        };
        /** SignalLimits */
        SignalLimits: {
            /** Cycles Truncated */
            cycles_truncated: boolean;
            /** Max Cycle Length */
            max_cycle_length: number;
            /** Max Cycle Steps */
            max_cycle_steps: number;
            /** Max Cycles */
            max_cycles: number;
            /** Max Occurrences Per Route */
            max_occurrences_per_route: number;
            /** Max Route Pairs */
            max_route_pairs: number;
            /** Max Routes */
            max_routes: number;
            /** Route Center Gid */
            route_center_gid: string;
            /** Routes Truncated */
            routes_truncated: boolean;
        };
        /** SignalReport */
        SignalReport: {
            /** Analysis Id */
            analysis_id: string;
            /** Anomalies */
            anomalies: components["schemas"]["Anomaly"][];
            /** Caveats */
            caveats: string[];
            /** Cycles */
            cycles: components["schemas"]["Cycle"][];
            /** Gid */
            gid: string;
            limits: components["schemas"]["SignalLimits"];
            /** Routes */
            routes: components["schemas"]["Route"][];
            temporal: components["schemas"]["TemporalSignals"];
        };
        /** SourceManifest */
        SourceManifest: {
            /** Files */
            files: components["schemas"]["ManifestFile"][];
            /** Normalization */
            normalization: string;
            /** Sha256 */
            sha256: string;
            /** Version */
            version: number;
        };
        /** Spike */
        Spike: {
            /** Baseline Median Kzt */
            baseline_median_kzt: number;
            /** Date */
            date: string;
            /** Ratio */
            ratio: number;
            /** Total Kzt */
            total_kzt: number;
        };
        /** Summary */
        Summary: {
            /** Analysis Id */
            analysis_id: string;
            counts: components["schemas"]["Counts"];
            dataset: components["schemas"]["Dataset"];
            /** Limitations */
            limitations: string[];
            period: components["schemas"]["Period"];
            /** Role Counts */
            role_counts: {
                [key: string]: number;
            };
            /** Runtime Ms */
            runtime_ms: number;
            /** Top Nodes */
            top_nodes: components["schemas"]["NodeSummary"][];
            /** Total Kzt */
            total_kzt: number;
        };
        /** SynchronizedInflow */
        SynchronizedInflow: {
            /** Date */
            date: string;
            /** Payer Count */
            payer_count: number;
            /** Payers */
            payers: string[];
            /** Sum Kzt */
            sum_kzt: number;
        };
        /** TemporalSignals */
        TemporalSignals: {
            /** Caveat */
            caveat: string;
            /** Overlap 2D Ratio */
            overlap_2d_ratio: number;
            /** Spikes */
            spikes: components["schemas"]["Spike"][];
            /** Synchronized Inflows */
            synchronized_inflows: components["schemas"]["SynchronizedInflow"][];
        };
        /** TimelineDay */
        TimelineDay: {
            /** Date */
            date: string;
            /** In Kzt */
            in_kzt: number;
            /** In Tx */
            in_tx: number;
            /** Out Kzt */
            out_kzt: number;
            /** Out Tx */
            out_tx: number;
        };
        /** TraceStep */
        TraceStep: {
            /** Elapsed Ms */
            elapsed_ms?: number | null;
            /**
             * Status
             * @enum {string}
             */
            status: "complete" | "cached";
            /** Tool */
            tool: string;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    clusters_api_v1_clusters_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClusterList"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Request Timeout */
            408: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Request Entity Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unsupported Media Type */
            415: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    collectors_api_v1_collectors_get: {
        parameters: {
            query: {
                gids: string;
                max_hops?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CollectorReport"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Request Timeout */
            408: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Request Entity Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unsupported Media Type */
            415: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    copilot_api_v1_copilot_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CopilotInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CopilotResponse"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Request Timeout */
            408: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Request Entity Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unsupported Media Type */
            415: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    create_conversation_api_v1_copilot_sessions_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SessionInput"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SessionResponse"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Request Timeout */
            408: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Request Entity Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unsupported Media Type */
            415: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    forget_conversation_api_v1_copilot_sessions__session_id__delete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                session_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Request Timeout */
            408: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Request Entity Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unsupported Media Type */
            415: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    copilot_status_api_v1_copilot_status_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CopilotStatus"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Request Timeout */
            408: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Request Entity Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unsupported Media Type */
            415: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    dossier_api_v1_dossier__gid__get: {
        parameters: {
            query?: {
                format?: "json" | "markdown";
            };
            header?: never;
            path: {
                gid: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Dossier"];
                    "text/markdown": string;
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Request Timeout */
            408: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Request Entity Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unsupported Media Type */
            415: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    export_api_v1_exports__name__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                name: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/csv": string;
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Request Timeout */
            408: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Request Entity Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unsupported Media Type */
            415: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    graph_api_v1_graph_get: {
        parameters: {
            query?: {
                gid?: string | null;
                hops?: number;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GraphData"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Request Timeout */
            408: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Request Entity Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unsupported Media Type */
            415: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    health_api_v1_health_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Health"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Request Timeout */
            408: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Request Entity Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unsupported Media Type */
            415: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    nodes_api_v1_nodes_get: {
        parameters: {
            query?: {
                query?: string;
                search?: string;
                role?: string | null;
                cluster_id?: number | null;
                limit?: number;
                offset?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NodeList"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Request Timeout */
            408: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Request Entity Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unsupported Media Type */
            415: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    node_api_v1_nodes__gid__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                gid: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NodeDetail"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Request Timeout */
            408: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Request Entity Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unsupported Media Type */
            415: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    provenance_api_v1_provenance_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Provenance"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Request Timeout */
            408: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Request Entity Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unsupported Media Type */
            415: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    resilience_api_v1_resilience_get: {
        parameters: {
            query?: {
                top_n?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ResilienceReport"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Request Timeout */
            408: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Request Entity Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unsupported Media Type */
            415: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    node_signals_api_v1_signals__gid__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                gid: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SignalReport"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Request Timeout */
            408: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Request Entity Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unsupported Media Type */
            415: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
    summary_api_v1_summary_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Summary"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Request Timeout */
            408: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Request Entity Too Large */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unsupported Media Type */
            415: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Unprocessable Entity */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Too Many Requests */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ErrorResponse"];
                };
            };
        };
    };
}
