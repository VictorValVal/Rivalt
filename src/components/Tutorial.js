import React, { useEffect, useRef, useState, useMemo } from 'react';
import './estilos/Tutorial.css';

const RIVALT_ORANGE_GLOW_COLOR = 'rgba(255, 109, 20, 0.65)';

function Tutorial({ targetRect, text, onNext, onClose, isLastStep, spotlightPadding = 0 }) {
    const textBoxRef = useRef(null);
    const [arrowStyle, setArrowStyle] = useState({});

    // Memo para el estilo del texto
    const textBoxStyle = useMemo(() => {
        if (!targetRect) {
            return { display: 'none' };
        }
        const screenEdgePadding = 20;
        let textBoxCalculatedWidth;
        if (window.innerWidth <= 480) {
            textBoxCalculatedWidth = window.innerWidth - (2 * screenEdgePadding);
        } else {
            textBoxCalculatedWidth = 320;
        }
        const style = {
            position: 'absolute',
            left: `${targetRect.left + targetRect.width / 2}px`,
            top: `${targetRect.bottom + spotlightPadding + 25}px`,
            transform: 'translateX(-50%)',
            width: window.innerWidth <= 480 ? `${textBoxCalculatedWidth}px` : 'auto',
            maxWidth: `${textBoxCalculatedWidth}px`,
            zIndex: 10002,
        };
        const textBoxHeightApproximation = 130;
        const initialTopPositionIfBelow = targetRect.bottom + spotlightPadding + 25;
        const spaceBelow = window.innerHeight - initialTopPositionIfBelow;
        const spaceAbove = targetRect.top - spotlightPadding - 25 - textBoxHeightApproximation;
        if (spaceBelow < textBoxHeightApproximation && spaceAbove > spaceBelow) {
            style.top = `${targetRect.top - spotlightPadding - 25}px`;
            style.transform = 'translateX(-50%) translateY(-100%)';
        }
        const halfTextBoxWidth = textBoxCalculatedWidth / 2;
        let desiredTextBoxCenter = parseFloat(style.left);
        const minCenterPosition = screenEdgePadding + halfTextBoxWidth;
        const maxCenterPosition = window.innerWidth - screenEdgePadding - halfTextBoxWidth;
        if (window.innerWidth <= textBoxCalculatedWidth + (2 * screenEdgePadding)) {
            style.left = '50%';
        } else {
            if (desiredTextBoxCenter < minCenterPosition) {
                desiredTextBoxCenter = minCenterPosition;
            } else if (desiredTextBoxCenter > maxCenterPosition) {
                desiredTextBoxCenter = maxCenterPosition;
            }
            style.left = `${desiredTextBoxCenter}px`;
        }
        return style;
    }, [targetRect, spotlightPadding]);

    // useEffect para la flecha
    useEffect(() => {
        if (targetRect && textBoxRef.current && textBoxStyle.display !== 'none') {
            const buttonRect = targetRect;
            const textRect = textBoxRef.current.getBoundingClientRect();

            let startX, startY;
            const endX = buttonRect.left + buttonRect.width / 2;
            const endY = buttonRect.top + buttonRect.height / 2 - (spotlightPadding > 0 ? 0 : 5);

            const textBoxIsBelowButton = textRect.top > (buttonRect.top + buttonRect.height / 2);
            const arrowOffsetFromEdge = 5;

            if (textBoxIsBelowButton) {
                startX = textRect.left + textRect.width / 2;
                startY = textRect.top + arrowOffsetFromEdge;
            } else {
                startX = textRect.left + textRect.width / 2;
                startY = textRect.bottom - arrowOffsetFromEdge;
            }

            const dx = endX - startX;
            const dy = endY - startY;
            let length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);

            const arrowheadHeight = 8;
            length = Math.max(0, length - arrowheadHeight);

            setArrowStyle({
                position: 'absolute',
                left: `${startX}px`,
                top: `${startY}px`,
                width: `${length}px`,
                height: '2px',
                backgroundColor: RIVALT_ORANGE_GLOW_COLOR,
                transformOrigin: '0 50%',
                transform: `rotate(${angle}deg)`,
                zIndex: 10001,
                pointerEvents: 'none',
                '--arrow-color': RIVALT_ORANGE_GLOW_COLOR,
            });
        } else {
            setArrowStyle({});
        }
    }, [targetRect, spotlightPadding, textBoxStyle]);

    // Spotlight
    const spotlightDiameter = targetRect
        ? Math.max(targetRect.width, targetRect.height) + (spotlightPadding * 2)
        : 0;
    const spotlightStyle = targetRect
        ? {
            position: 'absolute',
            left: `${targetRect.left + targetRect.width / 2 - spotlightDiameter / 2}px`,
            top: `${targetRect.top + targetRect.height / 2 - spotlightDiameter / 2}px`,
            width: `${spotlightDiameter}px`,
            height: `${spotlightDiameter}px`,
            borderRadius: '50%',
            boxShadow: `
                0 0 0 9999px rgba(0, 0, 0, 0.78)
            `,
            boxSizing: 'border-box',
            zIndex: 10001,
            pointerEvents: 'none',
        }
        : {};

    return (
        <div className="tutorial-overlay-backdrop">
            {targetRect && <div style={spotlightStyle}></div>}
            {targetRect && Object.keys(arrowStyle).length > 0 && (
                <div className="tutorial-arrow-line" style={arrowStyle}></div>
            )}
            {targetRect && textBoxStyle.display !== 'none' && (
                <div ref={textBoxRef} className="tutorial-text-box" style={textBoxStyle}>
                    <p>{text}</p>
                    <div className="tutorial-navigation">
                        <button onClick={onClose} className="tutorial-skip-button">Omitir</button>
                        <button onClick={onNext} className="tutorial-next-button">
                            {isLastStep ? 'Entendido' : 'Siguiente'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Tutorial;