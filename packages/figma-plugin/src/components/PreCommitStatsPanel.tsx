import { h, Fragment } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { emit, on } from '@create-figma-plugin/utilities';
import type { PreCommitStats } from '@figma-versioning/core';

export function PreCommitStatsPanel() {
  const [stats, setStats] = useState<PreCommitStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  // Function to request fresh stats
  const refreshStats = () => {
    console.log('[PreCommitStatsPanel] Requesting stats...');
    emit('GET_PRE_COMMIT_STATS');
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  useEffect(() => {
    // Request stats on mount
    refreshStats();

    const unsubscribeStats = on('PRE_COMMIT_STATS', function (data: { stats: PreCommitStats }) {
      console.log('[PreCommitStatsPanel] Received stats:', data.stats);
      setStats(data.stats);
      setIsLoading(false);
    });

    // Listen for change tracking events and auto-refresh
    const unsubscribeChanges = on('CHANGE_TRACKED', function () {
      console.log('[PreCommitStatsPanel] Change detected, refreshing stats...');
      refreshStats();
    });

    return () => {
      unsubscribeStats();
      unsubscribeChanges();
    };
  }, []);

  // Don't render anything while loading
  if (isLoading) {
    return null;
  }

  // Don't render if no stats or nothing to show
  if (!stats) {
    return null;
  }

  const hasChanges =
    stats.newCommentsCount > 0 ||
    stats.newAnnotationsCount > 0 ||
    stats.pageChanges.length > 0;

  // Don't render if no changes
  if (!hasChanges) {
    return null;
  }

  // Calculate total change count
  const totalNodeChanges = stats.pageChanges.reduce(
    (sum, page) => sum + page.nodesAdded + page.nodesRemoved + page.nodesModified,
    0
  );
  const totalChanges = totalNodeChanges + stats.newCommentsCount + stats.newAnnotationsCount;

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '16px',
      padding: '16px',
      backgroundColor: '#383838',
      borderRadius: '8px'
    },
    headerRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      cursor: 'pointer',
      userSelect: 'none' as const
    },
    headerContent: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      flex: 1
    },
    header: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 600,
      fontSize: '14px',
      color: 'white',
      margin: 0
    },
    caret: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '16px',
      height: '16px',
      color: 'white',
      transition: 'transform 0.2s ease',
      transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
      flexShrink: 0,
      cursor: 'pointer'
    },
    refreshButton: {
      background: 'none',
      border: 'none',
      color: '#008ff0',
      cursor: 'pointer',
      fontFamily: 'Inter, sans-serif',
      fontSize: '12px',
      padding: 0,
      textAlign: 'left' as const
    } as const,
    section: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '8px'
    },
    sectionTitle: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 500,
      fontSize: '12px',
      color: '#bbb',
      margin: 0
    },
    list: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '4px',
      margin: 0,
      padding: 0,
      listStyle: 'none'
    },
    listItem: {
      fontFamily: 'Inter, sans-serif',
      fontSize: '13px',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    icon: {
      fontSize: '14px'
    },
    warning: {
      fontFamily: 'Inter, sans-serif',
      fontSize: '11px',
      color: '#ff9800',
      margin: 0,
      fontStyle: 'italic' as const
    }
  };

  // Caret icon SVG
  const CaretIcon = () => (
    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  return (
    <div style={styles.container}>
      <div style={styles.headerRow} onClick={toggleExpanded}>
        <div style={styles.headerContent}>
          <p style={styles.header}>
            {totalChanges} change{totalChanges !== 1 ? 's' : ''} since last commit
          </p>
        </div>
        <div style={styles.caret}>
          <CaretIcon />
        </div>
      </div>

      {/* Refresh button below header */}
      <button
        style={styles.refreshButton}
        onClick={refreshStats}
      >
        ↻ Refresh
      </button>

      {/* Collapsible content */}
      {isExpanded && (
        <>
          {/* Page Changes Section */}
          {stats.pageChanges.length > 0 && (
        <div style={styles.section}>
          <p style={styles.sectionTitle}>📄 Pages with changes</p>
          <ul style={styles.list}>
            {stats.pageChanges.map((page) => (
              <li key={page.pageId} style={styles.listItem}>
                <span style={{ fontWeight: 500 }}>• {page.pageName}</span>
                <span style={{ color: '#bbb', fontSize: '12px' }}>
                  {page.nodesAdded > 0 && `+${page.nodesAdded} added`}
                  {page.nodesAdded > 0 && (page.nodesModified > 0 || page.nodesRemoved > 0) && ', '}
                  {page.nodesModified > 0 && `${page.nodesModified} modified`}
                  {page.nodesModified > 0 && page.nodesRemoved > 0 && ', '}
                  {page.nodesRemoved > 0 && `${page.nodesRemoved} removed`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Feedback Section */}
      {(stats.newCommentsCount > 0 || stats.newAnnotationsCount > 0) && (
        <div style={styles.section}>
          <p style={styles.sectionTitle}>Feedback</p>
          <ul style={styles.list}>
            {stats.newCommentsCount > 0 && (
              <li style={styles.listItem}>
                • {stats.newCommentsCount} new comment{stats.newCommentsCount !== 1 ? 's' : ''}
              </li>
            )}
            {stats.newAnnotationsCount > 0 && (
              <li style={styles.listItem}>
                • {stats.newAnnotationsCount} new annotation{stats.newAnnotationsCount !== 1 ? 's' : ''}
              </li>
            )}
          </ul>
        </div>
      )}

        </>
      )}
    </div>
  );
}
