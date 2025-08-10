#!/bin/bash

# work-on-spec.sh: Development environment setup script for working on specs
# Creates git worktree, branch, and tmux session for focused spec development

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CLEANUP_DONE=false
WORKTREE_CREATED=false
TMUX_SESSION_CREATED=false
CURRENT_ID=""
CURRENT_TMUX_SESSION=""

# Get script directory and repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] ✓${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ✗${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] ⚠${NC} $1"
}

# Error handler
error_exit() {
    log_error "$1"
    cleanup
    exit 1
}

# Cleanup function
cleanup() {
    if [ "$CLEANUP_DONE" = true ]; then
        return
    fi

    CLEANUP_DONE=true
    log "Cleaning up on error..."

    # Clean up tmux session if created
    if [ "$TMUX_SESSION_CREATED" = true ] && [ -n "$CURRENT_TMUX_SESSION" ]; then
        if tmux has-session -t "$CURRENT_TMUX_SESSION" 2>/dev/null; then
            log "Removing tmux session '$CURRENT_TMUX_SESSION'"
            tmux kill-session -t "$CURRENT_TMUX_SESSION" 2>/dev/null || true
        fi
    fi

    # Clean up worktree if created
    if [ "$WORKTREE_CREATED" = true ] && [ -n "$CURRENT_ID" ]; then
        local worktree_path="$REPO_ROOT/worktrees/$CURRENT_ID"
        if [ -d "$worktree_path" ]; then
            log "Removing worktree '$worktree_path'"
            git worktree remove "$worktree_path" --force 2>/dev/null || true
        fi
    fi

    log_success "Cleanup completed"
}

# Signal handlers
trap 'log "Received SIGINT (Ctrl+C)"; cleanup; exit 0' INT
trap 'log "Received SIGTERM"; cleanup; exit 0' TERM
trap 'cleanup; exit 1' ERR

# Usage information
usage() {
    echo "Usage: $0 <spec_id|task_id>"
    echo ""
    echo "Create development environment for working on a specific spec or task:"
    echo "  - Creates git worktree named <id>"
    echo "  - Creates git branch named <id>"
    echo "  - Creates tmux session with safe name (dots replaced with underscores)"
    echo "  - Session has three windows:"
    echo "    * git: for git operations and general terminal work"
    echo "    * tests: for running tests"
    echo "    * claude: for Claude Code interactions"
    echo ""
    echo "Arguments:"
    echo "  spec_id    The ID of the spec to work on (e.g., 20250729-ABCD)"
    echo "  task_id    The ID of the task to work on (e.g., 20250730-0000.PhMF)"
    echo ""
    echo "Examples:"
    echo "  $0 20250729-ABCD              # Work on a spec"
    echo "  $0 20250730-0000.PhMF         # Work on a task"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."

    # Check if we're in the right directory
    if [ ! -f "$REPO_ROOT/pyproject.toml" ]; then
        error_exit "Not in repository root. Expected pyproject.toml at $REPO_ROOT"
    fi

    # Check if git is available
    if ! command -v git &> /dev/null; then
        error_exit "git is not installed. Please install git first."
    fi

    # Check if tmux is available
    if ! command -v tmux &> /dev/null; then
        error_exit "tmux is not installed. Please install tmux first."
    fi

    # Check if uv is available (needed for backlog CLI)
    if ! command -v uv &> /dev/null; then
        error_exit "uv is not installed. Please install uv first."
    fi

    # Check if we're in a git repository
    if ! git rev-parse --git-dir &> /dev/null; then
        error_exit "Not in a git repository"
    fi

    log_success "Prerequisites check passed"
}

# Validate spec or task exists by checking with backlog CLI
validate_spec_or_task() {
    local id="$1"

    log "Validating spec or task exists: $id"

    cd "$REPO_ROOT"

    # First try to get it as a spec
    if uv run --env-file .env python -m src.backlog.cli backlog.get_spec --spec_id "$id" &>/dev/null; then
        log_success "Spec '$id' found"
        return 0
    fi

    # If that fails, try to get it as a task
    if uv run --env-file .env python -m src.backlog.cli backlog.get_task --task_id "$id" &>/dev/null; then
        log_success "Task '$id' found"
        return 0
    fi

    error_exit "spec or task '$id' were not found"
}

# Create safe tmux session name by replacing dots with underscores
create_safe_tmux_name() {
    local id="$1"
    echo "${id//./_}"
}

# Check if worktree already exists
check_worktree_exists() {
    local id="$1"
    local worktree_path="$REPO_ROOT/worktrees/$id"

    if [ -d "$worktree_path" ]; then
        error_exit "Worktree already exists at $worktree_path"
    fi

    # Also check if git worktree thinks it exists
    if git worktree list | grep -q "$id"; then
        error_exit "Git worktree '$id' already exists"
    fi
}

# Create git worktree and branch
create_git_worktree() {
    local id="$1"
    local worktree_path="$REPO_ROOT/worktrees/$id"
    local current_branch=$(git branch --show-current)

    log "Creating git worktree '$id' from branch '$current_branch'"

    # Ensure worktrees directory exists
    mkdir -p "$REPO_ROOT/worktrees"

    # Create worktree with new branch based on current branch
    if ! git worktree add -b "$id" "$worktree_path" "$current_branch"; then
        error_exit "Failed to create git worktree"
    fi

    log_success "Git worktree created at $worktree_path"
    log_success "Git branch '$id' created"
}

# Copy backlog data to new worktree
copy_backlog_data() {
    local id="$1"
    local worktree_path="$REPO_ROOT/worktrees/$id"

    log "Copying backlog data to new worktree"

    # Copy the backlog directory structure
    if [ -d "$REPO_ROOT/backlog" ]; then
        cp -r "$REPO_ROOT/backlog" "$worktree_path/"
        log_success "Backlog data copied to worktree"
    else
        log_warning "No backlog directory found to copy"
    fi
}

# Check if tmux session already exists
check_tmux_session_exists() {
    local tmux_session="$1"

    if tmux has-session -t "$tmux_session" 2>/dev/null; then
        error_exit "Tmux session '$tmux_session' already exists"
    fi
}

# Create tmux session with proper windows
create_tmux_session() {
    local tmux_session="$1"
    local id="$2"
    local worktree_path="$REPO_ROOT/worktrees/$id"

    log "Creating tmux session '$tmux_session' with three windows"

    # Create new tmux session in detached mode
    tmux new-session -d -s "$tmux_session" -c "$worktree_path"

    # Rename the first window to 'git'
    tmux rename-window -t "$tmux_session:0" "git"

    # Create 'tests' window
    tmux new-window -t "$tmux_session" -n "tests" -c "$worktree_path"

    # Create 'claude' window
    tmux new-window -t "$tmux_session" -n "claude" -c "$worktree_path"

    # Set the active window back to 'git'
    tmux select-window -t "$tmux_session:git"

    log_success "Tmux session '$tmux_session' created with windows: git, tests, claude"
}

# Main execution
main() {
    # Check for arguments
    if [ $# -eq 0 ]; then
        log_error "Missing required argument: spec_id or task_id"
        echo
        usage
        exit 1
    fi

    if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
        usage
        exit 0
    fi

    local id="$1"
    # Validate spec or task exists
    validate_spec_or_task "$id"
    echo

    local tmux_session=$(create_safe_tmux_name "$id")

    CURRENT_ID="$id"
    CURRENT_TMUX_SESSION="$tmux_session"

    log "Setting up development environment for: $id"
    echo

    # Check prerequisites
    check_prerequisites
    echo

    # Check if worktree already exists
    check_worktree_exists "$id"

    # Check if tmux session already exists
    check_tmux_session_exists "$tmux_session"

    log_success "All validations passed"
    echo

    # Create git worktree
    create_git_worktree "$id"
    WORKTREE_CREATED=true
    echo

    # Copy backlog data to new worktree
    copy_backlog_data "$id"
    echo

    # Create tmux session
    create_tmux_session "$tmux_session" "$id"
    TMUX_SESSION_CREATED=true
    echo

    log_success "Development environment setup completed!"
    echo
    echo -e "${GREEN}🚀 Environment ready for: $id${NC}"
    echo -e "   ${BLUE}Git worktree:${NC}    worktrees/$id"
    echo -e "   ${BLUE}Git branch:${NC}      $id"
    echo -e "   ${BLUE}Tmux session:${NC}    tmux attach-session -t $tmux_session"
    echo
    echo -e "${YELLOW}Windows available:${NC}"
    echo -e "   • ${BLUE}git${NC}     - Git operations and general terminal work"
    echo -e "   • ${BLUE}tests${NC}   - Running tests"
    echo -e "   • ${BLUE}claude${NC}  - Claude Code interactions"
    echo
}

# Run main function
main "$@"
