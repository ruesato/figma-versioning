import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { emit, on } from '@create-figma-plugin/utilities';
import type { PreCommitStats } from '@figma-versioning/core';

export function PreCommitStatsPanel() {
  const [stats, setStats] = useState<PreCommitStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Request stats on mount
    emit('GET_PRE_COMMIT_STATS');

    const unsubscribe = on('PRE_COMMIT_STATS', function (data: { stats: PreCommitStats }) {
      setStats(data.stats);
      setIsLoading(false);
    });

    return unsubscribe;
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

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '16px',
      padding: '16px',
      backgroundColor: '#383838',
      borderRadius: '8px'
    },
    header: {
      fontFamily: 'Inter, sans-serif',
      fontWeight: 600,
      fontSize: '14px',
      color: 'white',
      margin: 0
    },
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

  return (
    <div style={styles.container}>
      <p style={styles.header}>Changes since last commit</p>

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
          <p style={styles.sectionTitle}>💬 Feedback</p>
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

      {/* Warning if real-time tracking wasn't active */}
      {!stats.hasRealTimeTracking && (
        <p style={styles.warning}>
          Page changes not tracked (plugin wasn't running). Only showing comments and annotations.
        </p>
      )}
    </div>
  );
}
