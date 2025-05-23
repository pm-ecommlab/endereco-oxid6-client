<?php

namespace Endereco\Oxid6Client\Controller\Admin;

use OxidEsales\Eshop\Application\Controller\Admin\AdminController;

class Addresscheck extends AdminController
{

    private $predictions = [
        'countryCode',
        'postalCode',
        'locality',
        'streetName',
        'buildingNumber',
        'subdevisionCode',
        'additionalInfo'
    ];

    public function render()
    {

        parent::render();

        $soxId = $this->getEditObjectId();
        $oOrder = oxNew("oxorder");
        if($oOrder->load($soxId)) {
            $this->_aViewData['mojoamsstatus'] = explode(",",$oOrder->oxorder__mojoamsstatus->rawValue);
            $this->_aViewData['mojoamsts'] = date("d-m-Y H:i:s",intval($oOrder->oxorder__mojoamsts->rawValue));
            $this->_aViewData['mojoamspredictions'] = $this->getPredictions($oOrder->oxorder__mojoamspredictions->rawValue);
            $this->_aViewData['mojonamescore'] = $oOrder->oxorder__mojonamescore->rawValue;
        }

        return "addresscheck.tpl";
    }

    protected function getPredictions($predictionsJSON){
        $predictions = [];
        if($predictionsJSON){
            $predictions_array = json_decode($predictionsJSON);
            foreach($predictions_array as $prediction){
                $predictions[] = $this->getPredictionHtml($prediction);
            }
        }

        return $predictions;

    }

    protected function getPredictionHtml($prediction){
        $predictionHTML = "";
        foreach($this->predictions as $predictionKey){
            $predictionHTML .= "<div class='prediction'>".$predictionKey.": ".$prediction->$predictionKey."</div>";
        }

        return $predictionHTML;
    }
}