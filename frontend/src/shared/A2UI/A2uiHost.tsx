import { Component, type ReactNode } from "react";
import { A2uiSurface, type ReactCatalogComponent } from "@a2ui/react/v0_9";
import type {
  ActionPayload,
  MessageProcessor,
  SurfaceModel,
} from "@a2ui/web_core/v0_9";
import type { CatalogRegistry, SurfacePayload } from "./catalogRegistry";

type Props = {
  payload: SurfacePayload;
  registry: CatalogRegistry;
  dataPatches?: Record<string, unknown>;
  onAction: (action: ActionPayload) => Promise<void>;
  fallback: ReactNode;
};

// The host owns processor lifetime and catches errors in custom component renders
// and effects as well as message processing. Domain code supplies the catalog.
export class A2uiHost extends Component<
  Props,
  { surface?: SurfaceModel<ReactCatalogComponent>; failed: boolean }
> {
  state: { surface?: SurfaceModel<ReactCatalogComponent>; failed: boolean } = {
    failed: false,
  };
  private processor?: MessageProcessor<ReactCatalogComponent>;
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidMount() {
    this.load();
  }
  componentDidUpdate(previous: Props) {
    if (
      previous.payload !== this.props.payload ||
      previous.registry !== this.props.registry
    ) {
      this.load();
      return;
    }
    if (previous.dataPatches !== this.props.dataPatches && this.state.surface) {
      this.applyDataPatches(this.state.surface);
    }
  }
  componentWillUnmount() {
    this.processor?.dispose();
  }
  private applyDataPatches(surface: SurfaceModel<ReactCatalogComponent>) {
    if (!this.props.dataPatches) return;
    for (const [path, value] of Object.entries(this.props.dataPatches)) {
      if (value !== undefined) {
        surface.dataModel.set(path, value);
      }
    }
  }
  private load() {
    this.processor?.dispose();
    try {
      this.processor = this.props.registry.createProcessor(
        this.props.payload,
        (action) => this.props.onAction(action),
      );
      const surface = this.processor
        .getSurfaces()
        .get(this.props.payload.surfaceId);
      if (surface) {
        this.applyDataPatches(surface);
      }
      this.setState({
        surface,
        failed: false,
      });
    } catch {
      this.setState({ surface: undefined, failed: true });
    }
  }
  render() {
    if (this.state.failed) return this.props.fallback;
    return this.state.surface ? (
      <A2uiSurface surface={this.state.surface} />
    ) : null;
  }
}
